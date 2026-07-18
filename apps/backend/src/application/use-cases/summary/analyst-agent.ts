import type Anthropic from "@anthropic-ai/sdk";
import { normalizeDescription } from "../../../domain/services/occurrence-rules";
import { getClaudeClient, ANALYST_MODEL } from "../../../infra/ai/claude-client";
import type { Actor, UseCaseDeps } from "../../deps";
import { monthlySummary } from "./monthly-summary";

/** Trava contra loop infinito de tool use — nenhuma pergunta financeira precisa de mais que isso. */
const MAX_TURNS = 4;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_monthly_summary",
    description:
      "Receita total, despesa total, saldo total das contas e disponível projetado pro mês. Use pra perguntas de visão geral (quanto entrou, quanto saiu, quanto sobra no mês).",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "integer", description: "Ano, ex.: 2026" },
        month: { type: "integer", description: "Mês, 1-12" },
      },
      required: ["year", "month"],
    },
  },
  {
    name: "sum_by_category",
    description:
      "Soma de despesas por categoria num período. Use pra perguntas do tipo 'quanto gastei em X' ou 'onde gastei mais'.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Data inicial, YYYY-MM-DD" },
        to: { type: "string", description: "Data final, YYYY-MM-DD" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_invoice_total",
    description: "Total da fatura de um cartão específico num mês/ano. Use pra perguntas sobre fatura de crédito.",
    input_schema: {
      type: "object",
      properties: {
        cardName: { type: "string", description: "Nome ou apelido do cartão, como o usuário escreveu" },
        year: { type: "integer" },
        month: { type: "integer" },
      },
      required: ["cardName", "year", "month"],
    },
  },
  {
    name: "get_available_projection",
    description:
      "Só o disponível projetado pro mês (saldo + recorrências futuras − faturas não pagas). Use pra 'quanto vou ter disponível' / 'quanto sobra'.",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "integer" },
        month: { type: "integer" },
      },
      required: ["year", "month"],
    },
  },
];

const SYSTEM_PROMPT = `Você é o agente analítico de um assistente financeiro por WhatsApp (Camada 2 do pipeline — Opus, só perguntas complexas chegam até você).

Responda perguntas sobre os dados financeiros do usuário usando as tools disponíveis. As tools devolvem números já agregados via SQL — nunca invente números, nunca peça pra listar transações individuais.

Regras:
- Sempre chame uma tool antes de responder com números. Nunca responda de memória.
- Valores monetários das tools vêm em centavos — converta pra reais (÷100) na resposta.
- Respostas curtas e diretas (é WhatsApp, não relatório).
- Se a pergunta não for sobre as finanças do próprio usuário, recuse educadamente.`;

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function executeTool(
  deps: Pick<UseCaseDeps, "repos">,
  actor: Actor,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_monthly_summary": {
      const summary = await monthlySummary(deps, actor, input.year as number, input.month as number);
      return {
        incomeCents: summary.income,
        expenseCents: summary.expense,
        totalBalanceCents: summary.totalBalance,
        projectedAvailableCents: summary.projectedAvailable,
      };
    }
    case "sum_by_category": {
      const rows = await deps.repos.transaction.expenseByCategory(
        actor.workspaceId,
        input.from as string,
        input.to as string,
      );
      return rows.map((r) => ({ category: r.name, totalCents: r.total }));
    }
    case "get_invoice_total": {
      const cards = await deps.repos.card.listByWorkspace(actor.workspaceId);
      const hintNormalized = normalizeDescription(input.cardName as string);
      const card = cards.find((c) => !c.archivedAt && normalizeDescription(c.name) === hintNormalized);
      if (!card) return { error: "cartão não encontrado" };
      const invoices = await deps.repos.invoice.listByCard(card.id);
      const invoice = invoices.find(
        (i) => i.monthReference === input.month && i.yearReference === input.year,
      );
      if (!invoice) return { error: "fatura não encontrada pra esse período" };
      const totalCents = await deps.repos.invoice.total(invoice.id);
      return { cardName: card.name, status: invoice.status, totalCents };
    }
    case "get_available_projection": {
      const summary = await monthlySummary(deps, actor, input.year as number, input.month as number);
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
 * Camada 2 do pipeline de IA (M2-07): agente com tool use (Opus) — só
 * perguntas analíticas complexas chegam aqui (roteadas pela Camada 1).
 * Tools devolvem números agregados via SQL, nunca listas de transações
 * (spec: custo de token escala com o tamanho do resultado da tool).
 */
export async function answerAnalyticalQuestion(
  deps: Pick<UseCaseDeps, "repos">,
  actor: Actor,
  question: string,
): Promise<AnalystReply> {
  const client = getClaudeClient();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `[Hoje é ${todayIso()}]\n\n${question}` },
  ];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: ANALYST_MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });
    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((block) => block.type === "text");
      const body = textBlock?.type === "text" ? textBlock.text : "Não consegui responder isso agora.";
      return { body, usage: { inputTokens, outputTokens } };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(deps, actor, block.name, block.input as Record<string, unknown>);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    body: "Essa pergunta ficou complexa demais — tenta perguntar de um jeito mais direto.",
    usage: { inputTokens, outputTokens },
  };
}
