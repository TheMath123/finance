import { bankAccounts, type BankAccount } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { findWorkspaceBank } from "../../bank/services/shared";
import type { CreateAccountInput } from "../schemas";
import type { AccountError } from "../errors";

export async function createAccount(
  deps: DbDeps,
  actor: Actor,
  input: CreateAccountInput,
): Promise<Either<AccountError, BankAccount>> {
  const bank = await findWorkspaceBank(deps.db, actor.workspaceId, input.bankId);
  if (!bank) return left("bank_not_found");

  const created = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(bankAccounts)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning();
    if (!row) throw new Error("falha ao criar conta");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "bank_account",
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}
