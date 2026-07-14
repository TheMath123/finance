import { eq } from "drizzle-orm";
import { recurringTransactions } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { RecurringError } from "../errors";
import { findWorkspaceRecurring } from "./shared";

export async function deleteRecurring(
  deps: DbDeps,
  actor: Actor,
  recurringId: string,
): Promise<Either<RecurringError, null>> {
  const existing = await findWorkspaceRecurring(deps.db, actor.workspaceId, recurringId);
  if (!existing) return left("recurring_not_found");

  // FK das transações já lançadas tem onDelete: set null — histórico preservado
  await deps.db.transaction(async (tx) => {
    await tx.delete(recurringTransactions).where(eq(recurringTransactions.id, recurringId));
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "recurring_transaction",
      entityId: recurringId,
    });
  });
  return right(null);
}
