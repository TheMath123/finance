import { left, right, type Either } from "@finance/shared";
import type { ExpenseSplit } from "../../../domain/entities/expense-split";
import type { UseCaseDeps } from "../../deps";
import type { SplitError } from "./errors";

/**
 * Cancelamento só permitido enquanto NENHUMA parte foi paga/confirmada
 * (decisão de produto, M3-03) — soft-cancel, nunca mexe na transação
 * original da despesa.
 */
export async function cancelSplit(
  deps: Pick<UseCaseDeps, "repos">,
  actor: { userId: string },
  splitId: string,
): Promise<Either<SplitError, ExpenseSplit>> {
  const split = await deps.repos.expenseSplit.findById(splitId);
  if (!split || split.cancelledAt) return left("split_not_found");
  if (split.createdBy !== actor.userId) return left("not_creator");

  const shares = await deps.repos.splitShare.listBySplit(splitId);
  if (shares.some((s) => s.status !== "pending")) return left("shares_already_settled");

  const cancelled = await deps.repos.expenseSplit.cancel(splitId);
  return right(cancelled);
}
