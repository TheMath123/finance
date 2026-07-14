import { and, eq, inArray } from "drizzle-orm";
import { recurringTransactions, transactions } from "@finance/db";
import type { TransactionType } from "@finance/shared";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { occurrencesInMonth } from "../../../lib/occurrences";
import type { RecurringInput } from "../schemas";

export interface PendingOccurrence {
  recurringId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  method: RecurringInput["method"];
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
  deps: DbDeps,
  actor: Actor,
  year: number,
  month: number,
): Promise<PendingOccurrence[]> {
  const rules = await deps.db.query.recurringTransactions.findMany({
    where: and(
      eq(recurringTransactions.workspaceId, actor.workspaceId),
      eq(recurringTransactions.active, true),
    ),
  });
  if (rules.length === 0) return [];

  const confirmed = await deps.db
    .select({ recurringId: transactions.recurringId, date: transactions.date })
    .from(transactions)
    .where(
      inArray(
        transactions.recurringId,
        rules.map((r) => r.id),
      ),
    );
  const confirmedKeys = new Set(confirmed.map((c) => `${c.recurringId}:${c.date}`));

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
        method: rule.method as RecurringInput["method"],
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        cardId: rule.cardId,
      });
    }
  }
  return pending.sort((a, b) => a.date.localeCompare(b.date));
}
