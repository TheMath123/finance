import { eq } from "drizzle-orm";
import { transactions } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { TransactionError } from "../errors";
import { loadTransaction } from "./helpers";

/** Restaura simetricamente ao delete: parcelada restaura todo o grupo excluído. */
export async function restoreTransaction(
  deps: DbDeps,
  actor: Actor,
  id: string,
): Promise<Either<TransactionError, { restoredIds: string[] }>> {
  const { db } = deps;
  const existing = await loadTransaction(db, actor.workspaceId, id);
  if (!existing || !existing.deletedAt) return left("transaction_not_found");

  const restoredIds = await db.transaction(async (tx) => {
    const group = existing.installmentGroupId
      ? await tx.query.transactions.findMany({
          where: eq(transactions.installmentGroupId, existing.installmentGroupId),
        })
      : [existing];
    const deletedTargets = group.filter((t) => t.deletedAt !== null);

    const ids: string[] = [];
    for (const t of deletedTargets) {
      await tx.update(transactions).set({ deletedAt: null }).where(eq(transactions.id, t.id));
      await recordAudit(tx, {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "restore",
        entity: "transaction",
        entityId: t.id,
      });
      ids.push(t.id);
    }
    return ids;
  });
  return right({ restoredIds });
}
