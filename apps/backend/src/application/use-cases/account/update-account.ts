import { left, right, type Either } from "@finance/shared";
import type { BankAccount } from "../../../domain/entities/bank-account";
import type { Actor, UseCaseDeps } from "../../deps";
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
  if (input.bankId) {
    const bank = await deps.repos.bank.findInWorkspace(actor.workspaceId, input.bankId);
    if (!bank) return left("bank_not_found");
  }

  const updated = await deps.uow.run(async (repos) => {
    const account = await repos.account.update(accountId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "bank_account",
      entityId: account.id,
    });
    return account;
  });
  return right(updated);
}
