import { eq, or } from "drizzle-orm";
import { bankAccounts, transactions } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { AccountError } from "../errors";
import { findWorkspaceAccount } from "./shared";

/** Conta com transações não é deletável — arquiva (regra do spec). */
export async function deleteAccount(
  deps: DbDeps,
  actor: Actor,
  accountId: string,
): Promise<Either<AccountError, null>> {
  const existing = await findWorkspaceAccount(deps.db, actor.workspaceId, accountId);
  if (!existing) return left("account_not_found");

  const hasTransaction = await deps.db.query.transactions.findFirst({
    where: or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)),
  });
  if (hasTransaction) return left("account_has_transactions");

  await deps.db.transaction(async (tx) => {
    await tx.delete(bankAccounts).where(eq(bankAccounts.id, accountId));
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "bank_account",
      entityId: accountId,
    });
  });
  return right(null);
}
