import { eq } from "drizzle-orm";
import { banks, type Bank } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { BankError } from "../errors";
import { findWorkspaceBank } from "./shared";

export async function archiveBank(
  deps: DbDeps,
  actor: Actor,
  bankId: string,
  archived: boolean,
): Promise<Either<BankError, Bank>> {
  const existing = await findWorkspaceBank(deps.db, actor.workspaceId, bankId);
  if (!existing) return left("bank_not_found");

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(banks)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(banks.id, bankId))
      .returning();
    if (!row) throw new Error("falha ao arquivar banco");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "bank",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}
