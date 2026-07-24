import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import { getAiClient, getRouterModel } from '../../../infra/ai/ai-client';
import type { UseCaseDeps } from '../../deps';
import { answerAnalyticalQuestion } from '../summary/analyst-agent';
import { createTransaction } from './create-transaction';

const RouterOutputSchema = z.object({
  intent: z.enum([
    'register_transaction',
    'analytical_question',
    'out_of_scope',
  ]),
  transaction: z
    .object({
      description: z.string().min(1),
      amountCents: z.number().int().positive(),
      type: z.enum(['income', 'expense']),
      method: z.enum(['pix', 'debit', 'cash', 'credit']),
      /** Nome aproximado da categoria em português — resolvido depois contra as categorias reais do workspace. */
      categoryHint: z.string(),
      /** Apelido/nome da conta ou cartão mencionado no texto, ou null se não mencionado. */
      accountOrCardHint: z.string().nullable(),
    })
    .nullable(),
  /** Preenchido quando a mensagem é ambígua demais pra registrar com confiança — vira a resposta pro usuário. */
  clarification: z.string().nullable(),
});

/**
 * System prompt congelado (spec: nada volátil aqui — data/hora e nome do
 * usuário ficam de fora) pra maximizar o reaproveitamento de cache de
 * prompt automático que a maioria dos provedores faz por prefixo idêntico
 * (não dá mais pra controlar isso explicitamente por parâmetro — como no
 * `cache_control` da Anthropic — já que o modelo é escolhido por env, sem
 * lock-in num provedor). Categorias/contas do workspace também ficam de
 * fora de propósito: são resolvidas depois, no código, contra os dados
 * reais — assim o schema de saída e o prompt são idênticos pra todo mundo.
 */
const SYSTEM_PROMPT = `Você é o roteador de mensagens de um assistente financeiro por WhatsApp (camada barata do pipeline).

Classifique a intenção da mensagem:
- "register_transaction": o usuário quer registrar uma transação financeira (gasto, receita).
- "analytical_question": o usuário está perguntando sobre os próprios dados financeiros (quanto gastei, saldo, fatura, etc.) — não tente responder, só classifique.
- "out_of_scope": qualquer assunto fora do domínio financeiro pessoal.

Regras pra "register_transaction":
- Só use essa intenção se houver um valor monetário claro na mensagem.
- Extraia o método de pagamento de pistas no texto (pix, débito, dinheiro, cartão/crédito); sem pista nenhuma, assuma "pix".
- "categoryHint" é o nome de categoria mais provável em português (ex.: "Mercado", "Transporte", "Lazer", "Saúde") — aproximado está OK, o sistema resolve pro ID certo depois.
- "accountOrCardHint" é o nome/apelido de conta ou cartão exatamente como o usuário escreveu, ou null se não mencionou nenhum.
- Se a mensagem for ambígua demais pra extrair os campos com confiança (ex.: falta o valor, ou o texto é confuso), não preencha "transaction" — em vez disso, preencha "clarification" com uma pergunta curta e direta em português.

Nunca invente dados que não estão na mensagem. Respostas objetivas, sem floreio.`;

export interface ChatbotReply {
  body: string;
  usage: { inputTokens: number; outputTokens: number };
}

async function resolveCategoryId(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspaceId: string,
  categoryHint: string
): Promise<string> {
  const categories = await deps.repos.category.listByWorkspace(workspaceId);
  const hintNormalized = normalizeDescription(categoryHint);
  const match = categories.find(
    (c) => normalizeDescription(c.name) === hintNormalized
  );
  if (match) return match.id;

  const fallback = await deps.repos.category.findFallback(workspaceId);
  if (fallback) return fallback.id;
  // Não deveria acontecer (todo workspace nasce com "Outros"), mas não trava o fluxo por isso.
  return categories[0]!.id;
}

export type ResolvedTarget =
  | { kind: 'account' | 'card'; id: string }
  | null
  | 'ambiguous';

/** Exportada — reaproveitada pelo fallback determinístico (`handle-inbound-message.ts`) quando a IA está fora do ar. */
export async function resolveAccountOrCard(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspaceId: string,
  hint: string | null
): Promise<ResolvedTarget> {
  const [accounts, cards] = await Promise.all([
    deps.repos.account.listByWorkspace(workspaceId),
    deps.repos.card.listByWorkspace(workspaceId),
  ]);
  const activeAccounts = accounts.filter((a) => !a.archivedAt);
  const activeCards = cards.filter((c) => !c.archivedAt);

  if (!hint) {
    const total = activeAccounts.length + activeCards.length;
    if (total !== 1) return null;
    return activeAccounts.length === 1
      ? { kind: 'account', id: activeAccounts[0]!.id }
      : { kind: 'card', id: activeCards[0]!.id };
  }

  const hintNormalized = normalizeDescription(hint);
  const matches: { kind: 'account' | 'card'; id: string }[] = [];
  for (const a of activeAccounts) {
    if (normalizeDescription(a.name) === hintNormalized)
      matches.push({ kind: 'account', id: a.id });
  }
  for (const c of activeCards) {
    if (normalizeDescription(c.name) === hintNormalized)
      matches.push({ kind: 'card', id: c.id });
  }
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) return 'ambiguous';
  return null;
}

/**
 * Camada 1 do pipeline de IA (M2-07): roteador barato — classifica a
 * intenção e, se for registro de transação, extrai os campos via structured
 * output. Chamado só quando a Camada 0 (determinística) não resolveu.
 * Modelo vem do env (`getRouterModel`, gateway OpenRouter) — trocável sem
 * mudar código, sem lock-in num provedor de IA específico.
 */
export async function routeChatbotMessage(
  deps: Pick<UseCaseDeps, 'repos' | 'uow' | 'cache'>,
  workspaceId: string,
  userId: string,
  text: string
): Promise<ChatbotReply> {
  const client = getAiClient();
  const response = await client.chat.completions.parse({
    model: getRouterModel(),
    max_tokens: 1024,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    response_format: zodResponseFormat(RouterOutputSchema, 'router_output'),
  });

  const usage = {
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };

  const parsed = response.choices[0]?.message.parsed;
  if (!parsed) {
    return {
      body: 'Não consegui entender essa mensagem. Pode reformular?',
      usage,
    };
  }

  if (parsed.intent === 'out_of_scope') {
    return {
      body: 'Só consigo ajudar com suas finanças por aqui — registrar gastos/receitas ou responder sobre seus dados financeiros.',
      usage,
    };
  }

  if (parsed.intent === 'analytical_question') {
    const analystResult = await answerAnalyticalQuestion(
      deps,
      { userId, workspaceId, role: 'member' },
      text
    );
    return {
      body: analystResult.body,
      usage: {
        inputTokens: usage.inputTokens + analystResult.usage.inputTokens,
        outputTokens: usage.outputTokens + analystResult.usage.outputTokens,
      },
    };
  }

  if (parsed.clarification || !parsed.transaction) {
    return {
      body:
        parsed.clarification ?? 'Pode dar mais detalhes sobre essa transação?',
      usage,
    };
  }

  const { transaction } = parsed;
  const categoryId = await resolveCategoryId(
    deps,
    workspaceId,
    transaction.categoryHint
  );
  const target = await resolveAccountOrCard(
    deps,
    workspaceId,
    transaction.accountOrCardHint
  );

  if (target === 'ambiguous') {
    return {
      body: `Tenho mais de uma conta/cartão parecido com "${transaction.accountOrCardHint}". Qual deles?`,
      usage,
    };
  }
  if (!target) {
    return { body: 'Em qual conta ou cartão foi essa transação?', usage };
  }

  const result = await createTransaction(
    deps,
    { userId, workspaceId, role: 'member' },
    {
      description: transaction.description,
      amount: transaction.amountCents,
      type: transaction.type,
      method: target.kind === 'card' ? 'credit' : transaction.method,
      date: new Date().toISOString().slice(0, 10),
      categoryId,
      accountId: target.kind === 'account' ? target.id : undefined,
      cardId: target.kind === 'card' ? target.id : undefined,
      source: 'chatbot',
    }
  );

  if (!result.ok) {
    return {
      body: 'Não consegui registrar essa transação. Confere os dados no app?',
      usage,
    };
  }

  return {
    body: `Registrado: ${transaction.description} — R$ ${(transaction.amountCents / 100).toFixed(2)}.`,
    usage,
  };
}
