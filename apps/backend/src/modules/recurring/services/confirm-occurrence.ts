import { and, eq } from "drizzle-orm";
import { transactions, type Transaction } from "@finance/db";
import { left, type Either } from "@finance/shared";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { occurrencesInMonth } from "../../../lib/occurrences";
import { createTransaction } from "../../transaction/services/create-transaction";
import type { RecurringInput } from "../schemas";
import type { RecurringError } from "../errors";
import { findWorkspaceRecurring } from "./shared";

/** Confirmação com um toque: materializa a ocorrência como transação real. */
export async function confirmOccurrence(
  deps: DbDeps,
  actor: Actor,
  recurringId: string,
  date: string,
): Promise<Either<RecurringError, Transaction[]>> {
  const rule = await findWorkspaceRecurring(deps.db, actor.workspaceId, recurringId);
  if (!rule) return left("recurring_not_found");

  const [y, m] = date.split("-").map(Number) as [number, number];
  if (!occurrencesInMonth(rule, y, m).includes(date)) return left("not_an_occurrence");

  const existing = await deps.db.query.transactions.findFirst({
    where: and(eq(transactions.recurringId, recurringId), eq(transactions.date, date)),
  });
  if (existing) return left("occurrence_already_confirmed");

  return createTransaction(deps, actor, {
    description: rule.description,
    amount: rule.amount,
    type: rule.type,
    method: rule.method as RecurringInput["method"],
    date,
    categoryId: rule.categoryId,
    accountId: rule.accountId ?? undefined,
    cardId: rule.cardId ?? undefined,
    recurringId: rule.id,
  });
}
