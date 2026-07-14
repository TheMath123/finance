import { eq } from "drizzle-orm";
import { bankAccounts, type BankAccount } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { AccountError } from "../errors";
import { findWorkspaceAccount } from "./shared";

export async function archiveAccount(
  deps: DbDeps,
  actor: Actor,
  accountId: string,
  archived: boolean,
): Promise<Either<AccountError, BankAccount>> {
  const existing = await findWorkspaceAccount(deps.db, actor.workspaceId, accountId);
  if (!existing) return left("account_not_found");

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(bankAccounts)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(bankAccounts.id, accountId))
      .returning();
    if (!row) throw new Error("falha ao arquivar conta");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "bank_account",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}
