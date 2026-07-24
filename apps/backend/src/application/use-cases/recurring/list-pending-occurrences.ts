import type { TransactionType } from '@finance/shared';
import { occurrencesInMonth } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CreateRecurringInput } from './create-recurring';

export interface PendingOccurrence {
  recurringId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  method: CreateRecurringInput['method'];
  categoryId: string;
  accountId: string | null;
  cardId: string | null;
}

/**
 * Ocorrências previstas do mês ainda não confirmadas (regra do spec, M1):
 * a recorrência aparece como prevista e o app oferece confirmar com um toque.
 * Confirmada = existe transação com (recurring_id, date) — soft-deletadas contam
 * (excluir o lançamento não faz a sugestão voltar).
 */
export async function listPendingOccurrences(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: Actor,
  year: number,
  month: number
): Promise<PendingOccurrence[]> {
  const rules = await deps.repos.recurring.listActive(actor.workspaceId);
  if (rules.length === 0) return [];

  const confirmed = await deps.repos.transaction.confirmedOccurrenceKeys(
    rules.map((r) => r.id)
  );
  const confirmedKeys = new Set(
    confirmed.map((c) => `${c.recurringId}:${c.date}`)
  );

  const pending: PendingOccurrence[] = [];
  for (const rule of rules) {
    for (const date of occurrencesInMonth(rule, year, month)) {
      if (confirmedKeys.has(`${rule.id}:${date}`)) continue;
      pending.push({
        recurringId: rule.id,
        date,
        description: rule.description,
        amount: rule.amount,
        type: rule.type,
        method: rule.method as CreateRecurringInput['method'],
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        cardId: rule.cardId,
      });
    }
  }
  return pending.sort((a, b) => a.date.localeCompare(b.date));
}
