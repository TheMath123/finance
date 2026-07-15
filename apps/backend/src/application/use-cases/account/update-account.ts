import { left, right, type Either } from "@finance/shared";
import type { BankAccount } from "../../../domain/entities/bank-account";
import type { Actor, UseCaseDeps } from "../../deps";
import { findOrCreateBank } from "../bank/find-or-create-bank";
import type { AccountError } from "./errors";
import type { CreateAccountInput } from "./create-account";

export async function updateAccount(
  deps: UseCaseDeps,
  actor: Actor,
  accountId: string,
  input: Partial<CreateAccountInput>,
): Promise<Either<AccountError, BankAccount>> {
  const existing = await deps.repos.account.findInWorkspace(actor.workspaceId, accountId);
  if (!existing) return left("account_not_found");

  const updated = await deps.uow.run(async (repos) => {
    let bankId: string | undefined;
    if (input.bankCode) {
      const bank = await findOrCreateBank(repos, actor.workspaceId, input.bankCode);
      if (!bank.ok) return bank;
      bankId = bank.value.id;
    }

    const account = await repos.account.update(accountId, {
      name: input.name,
      bankId,
      type: input.type,
      initialBalance: input.initialBalance,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "bank_account",
      entityId: account.id,
    });
    return right(account);
  });
  if (!updated.ok) return left("invalid_bank_code");
  return updated;
}
