import { left, right, type Either } from "@finance/shared";
import type { Actor, UseCaseDeps } from "../../deps";
import type { RecurringError } from "./errors";

export async function deleteRecurring(
  deps: UseCaseDeps,
  actor: Actor,
  recurringId: string,
): Promise<Either<RecurringError, null>> {
  const existing = await deps.repos.recurring.findInWorkspace(actor.workspaceId, recurringId);
  if (!existing) return left("recurring_not_found");

  // FK das transações já lançadas tem onDelete: set null — histórico preservado
  await deps.uow.run(async (repos) => {
    await repos.recurring.delete(recurringId);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "recurring_transaction",
      entityId: recurringId,
    });
  });
  return right(null);
}
