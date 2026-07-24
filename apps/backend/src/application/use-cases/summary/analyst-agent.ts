import type OpenAI from 'openai';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import { getAiClient, getAnalystModel } from '../../../infra/ai/ai-client';
import type { Actor, UseCaseDeps } from '../../deps';
import { monthlySummary } from './monthly-summary';

/** Trava contra loop infinito de tool use — nenhuma pergunta financeira precisa de mais que isso. */
const MAX_TURNS = 4;

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_monthly_summary',
      description:
        'Receita total, despesa total, saldo total das contas e disponível projetado pro mês. Use pra perguntas de visão geral (quanto entrou, quanto saiu, quanto sobra no mês).',
      parameters: {
        type: 'object',
        properties: {
          year: { type: 'integer', description: 'Ano, ex.: 2026' },
          month: { type: 'integer', description: 'Mês, 1-12' },
        },
        required: ['year', 'month'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sum_by_category',
      description:
        "Soma de despesas por categoria num período. Use pra perguntas do tipo 'quanto gastei em X' ou 'onde gastei mais'.",
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Data inicial, YYYY-MM-DD' },
          to: { type: 'string', description: 'Data final, YYYY-MM-DD' },
        },
        required: ['from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoice_total',
      description:
        'Total da fatura de um cartão específico num mês/ano. Use pra perguntas sobre fatura de crédito.',
      parameters: {
        type: 'object',
        properties: {
          cardName: {
            type: 'string',
            description: 'Nome ou apelido do cartão, como o usuário escreveu',
          },
          year: { type: 'integer' },
          month: { type: 'integer' },
        },
        required: ['cardName', 'year', 'month'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_projection',
      description:
        "Só o disponível projetado pro mês (saldo + recorrências futuras − faturas não pagas). Use pra 'quanto vou ter disponível' / 'quanto sobra'.",
      parameters: {
        type: 'object',
        properties: {
          year: { type: 'integer' },
          month: { type: 'integer' },
        },
        required: ['year', 'month'],
      },
    },
  },
];

const SYSTEM_PROMPT = `Você é o agente analítico de um assistente financeiro por WhatsApp (Camada 2 do pipeline, só perguntas complexas chegam até você).

Responda perguntas sobre os dados financeiros do usuário usando as tools disponíveis. As tools devolvem números já agregados via SQL — nunca invente números, nunca peça pra listar transações individuais.

Regras:
- Sempre chame uma tool antes de responder com números. Nunca responda de memória.
- Valores monetários das tools vêm em centavos — converta pra reais (÷100) na resposta.
- Respostas curtas e diretas (é WhatsApp, não relatório).
- Se a pergunta não for sobre as finanças do próprio usuário, recuse educadamente.`;

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function executeTool(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>,
  actor: Actor,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_monthly_summary': {
      const summary = await monthlySummary(
        deps,
        actor,
        input.year as number,
        input.month as number
      );
      return {
        incomeCents: summary.income,
        expenseCents: summary.expense,
        totalBalanceCents: summary.totalBalance,
        projectedAvailableCents: summary.projectedAvailable,
      };
    }
    case 'sum_by_category': {
      const rows = await deps.repos.transaction.expenseByCategory(
        actor.workspaceId,
        input.from as string,
        input.to as string
      );
      return rows.map((r) => ({ category: r.name, totalCents: r.total }));
    }
    case 'get_invoice_total': {
      const cards = await deps.repos.card.listByWorkspace(actor.workspaceId);
      const hintNormalized = normalizeDescription(input.cardName as string);
      const card = cards.find(
        (c) => !c.archivedAt && normalizeDescription(c.name) === hintNormalized
      );
      if (!card) return { error: 'cartão não encontrado' };
      const invoices = await deps.repos.invoice.listByCard(card.id);
      const invoice = invoices.find(
        (i) =>
          i.monthReference === input.month && i.yearReference === input.year
      );
      if (!invoice) return { error: 'fatura não encontrada pra esse período' };
      const totalCents = await deps.repos.invoice.total(invoice.id);
      return { cardName: card.name, status: invoice.status, totalCents };
    }
    case 'get_available_projection': {
      const summary = await monthlySummary(
        deps,
        actor,
        input.year as number,
        input.month as number
      );
      return { projectedAvailableCents: summary.projectedAvailable };
    }
    default:
      return { error: `tool desconhecida: ${name}` };
  }
}

export interface AnalystReply {
  body: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Camada 2 do pipeline de IA (M2-07): agente com tool use — só perguntas
 * analíticas complexas chegam aqui (roteadas pela Camada 1). Tools devolvem
 * números agregados via SQL, nunca listas de transações (spec: custo de
 * token escala com o tamanho do resultado da tool). Modelo vem do env
 * (`getAnalystModel`, gateway OpenRouter) — mais capaz que o da Camada 1,
 * mas ainda trocável sem lock-in num provedor.
 */
export async function answerAnalyticalQuestion(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>,
  actor: Actor,
  question: string
): Promise<AnalystReply> {
  const client = getAiClient();
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `[Hoje é ${todayIso()}]\n\n${question}` },
  ];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.chat.completions.create({
      model: getAnalystModel(),
      max_tokens: 1024,
      tools: TOOLS,
      messages,
    });
    inputTokens += response.usage?.prompt_tokens ?? 0;
    outputTokens += response.usage?.completion_tokens ?? 0;

    const choice = response.choices[0];
    const toolCalls = choice?.message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const body =
        choice?.message.content ?? 'Não consegui responder isso agora.';
      return { body, usage: { inputTokens, outputTokens } };
    }

    messages.push(choice.message);

    for (const call of toolCalls) {
      if (call.type !== 'function') continue;
      const args = JSON.parse(call.function.arguments) as Record<
        string,
        unknown
      >;
      const result = await executeTool(deps, actor, call.function.name, args);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    body: 'Essa pergunta ficou complexa demais — tenta perguntar de um jeito mais direto.',
    usage: { inputTokens, outputTokens },
  };
}
