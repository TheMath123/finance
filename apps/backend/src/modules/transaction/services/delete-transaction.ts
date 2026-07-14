import { and, eq, isNull } from "drizzle-orm";
import { transactions, type Transaction } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { TransactionError } from "../errors";
import { isInPaidInvoice, loadTransaction } from "./helpers";

/** Soft delete; compra parcelada exclui todas as parcelas não pagas (regra do spec). */
export async function deleteTransaction(
  deps: DbDeps,
  actor: Actor,
  id: string,
): Promise<Either<TransactionError, { deletedIds: string[] }>> {
  const { db } = deps;
  const existing = await loadTransaction(db, actor.workspaceId, id);
  if (!existing || existing.deletedAt) return left("transaction_not_found");
  if (await isInPaidInvoice(db, existing)) return left("invoice_paid");

  const deletedIds = await db.transaction(async (tx) => {
    let targets: Transaction[];
    if (existing.installmentGroupId) {
      const group = await tx.query.transactions.findMany({
        where: and(
          eq(transactions.installmentGroupId, existing.installmentGroupId),
          isNull(transactions.deletedAt),
        ),
      });
      // Só as parcelas cuja fatura não está paga
      const unpaid: Transaction[] = [];
      for (const t of group) {
        if (!(await isInPaidInvoice(db, t))) unpaid.push(t);
      }
      targets = unpaid;
    } else {
      targets = [existing];
    }

    const ids: string[] = [];
    for (const t of targets) {
      await tx.update(transactions).set({ deletedAt: new Date() }).where(eq(transactions.id, t.id));
      await recordAudit(tx, {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "delete",
        entity: "transaction",
        entityId: t.id,
      });
      ids.push(t.id);
    }
    return ids;
  });
  return right({ deletedIds });
}
