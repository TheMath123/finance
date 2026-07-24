import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import { parseAmountAndRest } from '../../../domain/services/transaction-text-parser';
import type { UseCaseDeps } from '../../deps';
import type { CreateTransactionInput } from './create-transaction';

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Camada 0 do pipeline de IA (M2-07): só resolve o que é "óbvio" e barato —
 * precisa achar exatamente uma conta/cartão ativo mencionado no texto E já
 * ter visto essa descrição antes (cache de categorização). Qualquer
 * ambiguidade ou descrição nova cai pra Camada 1 (`null` — segue pra IA).
 * Só cobre despesa (o caso comum de "gastei X"); receita fica pra Camada 1.
 */
export async function parseObviousTransaction(
  deps: Pick<UseCaseDeps, 'repos'>,
  workspaceId: string,
  text: string
): Promise<CreateTransactionInput | null> {
  const parsed = parseAmountAndRest(text);
  if (!parsed) return null;

  const [accounts, cards] = await Promise.all([
    deps.repos.account.listByWorkspace(workspaceId),
    deps.repos.card.listByWorkspace(workspaceId),
  ]);

  const restNormalized = normalizeDescription(parsed.rest);
  const restWords = parsed.rest.split(/\s+/);

  const candidates: {
    kind: 'account' | 'card';
    id: string;
    wordCount: number;
  }[] = [];
  for (const account of accounts) {
    if (account.archivedAt) continue;
    const nameNormalized = normalizeDescription(account.name);
    if (
      restNormalized === nameNormalized ||
      restNormalized.endsWith(` ${nameNormalized}`)
    ) {
      candidates.push({
        kind: 'account',
        id: account.id,
        wordCount: account.name.trim().split(/\s+/).length,
      });
    }
  }
  for (const card of cards) {
    if (card.archivedAt) continue;
    const nameNormalized = normalizeDescription(card.name);
    if (
      restNormalized === nameNormalized ||
      restNormalized.endsWith(` ${nameNormalized}`)
    ) {
      candidates.push({
        kind: 'card',
        id: card.id,
        wordCount: card.name.trim().split(/\s+/).length,
      });
    }
  }

  // Ambíguo (mais de uma conta/cartão bate) ou nenhum — não arrisca, cai pra Camada 1.
  if (candidates.length !== 1) return null;
  const match = candidates[0]!;

  const description = restWords
    .slice(0, restWords.length - match.wordCount)
    .join(' ')
    .trim();
  if (!description) return null;

  const categoryId = await deps.repos.transaction.findMostUsedCategory(
    workspaceId,
    normalizeDescription(description)
  );
  if (!categoryId) return null;

  return {
    description,
    amount: parsed.amountCents,
    type: 'expense',
    method: match.kind === 'card' ? 'credit' : 'pix',
    date: todayIso(),
    categoryId,
    accountId: match.kind === 'account' ? match.id : undefined,
    cardId: match.kind === 'card' ? match.id : undefined,
  };
}
