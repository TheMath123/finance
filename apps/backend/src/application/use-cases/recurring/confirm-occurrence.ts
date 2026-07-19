import { left, type Either } from "@finance/shared";
import type { Transaction } from "../../../domain/entities/transaction";
import { occurrencesInMonth } from "../../../domain/services/occurrence-rules";
import { isUniqueConstraintError } from "../../errors";
import type { Actor, UseCaseDeps } from "../../deps";
import { createTransaction } from "../transaction/create-transaction";
import type { RecurringError } from "./errors";
import type { CreateRecurringInput } from "./create-recurring";

/**
 * Confirmação com um toque: materializa a ocorrência como transação real. A
 * checagem de `findByRecurringAndDate` sozinha não é atômica (leitura antes
 * de escrever, sem lock) — a constraint única em `(recurring_id, date)`
 * (auditoria de segurança, 2026-07-19) é quem de fato impede duas
 * confirmações concorrentes (manual + sweep, ou dois sweeps de réplicas
 * diferentes) de criarem duas transações reais pra mesma ocorrência.
 */
export async function confirmOccurrence(
  deps: Pick<UseCaseDeps, "repos" | "uow">,
  actor: Actor,
  recurringId: string,
  date: string,
): Promise<Either<RecurringError, Transaction[]>> {
  const rule = await deps.repos.recurring.findInWorkspace(actor.workspaceId, recurringId);
  if (!rule) return left("recurring_not_found");

  const [y, m] = date.split("-").map(Number) as [number, number];
  if (!occurrencesInMonth(rule, y, m).includes(date)) return left("not_an_occurrence");

  const existing = await deps.repos.transaction.findByRecurringAndDate(recurringId, date);
  if (existing) return left("occurrence_already_confirmed");

  try {
    return await createTransaction(deps, actor, {
      description: rule.description,
      amount: rule.amount,
      type: rule.type,
      method: rule.method as CreateRecurringInput["method"],
      date,
      categoryId: rule.categoryId,
      accountId: rule.accountId ?? undefined,
      cardId: rule.cardId ?? undefined,
      recurringId: rule.id,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return left("occurrence_already_confirmed");
    throw error;
  }
}
