import { left, right, type Either } from "@finance/shared";
import type { AccountType } from "@finance/shared";
import type { BankAccount } from "../../../domain/entities/bank-account";
import type { Actor, UseCaseDeps } from "../../deps";
import type { AccountError } from "./errors";

export interface CreateAccountInput {
  name: string;
  bankId: string;
  type: AccountType;
  initialBalance: number;
}

export async function createAccount(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateAccountInput,
): Promise<Either<AccountError, BankAccount>> {
  const bank = await deps.repos.bank.findInWorkspace(actor.workspaceId, input.bankId);
  if (!bank) return left("bank_not_found");

  const created = await deps.uow.run(async (repos) => {
    const account = await repos.account.create(actor.workspaceId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "bank_account",
      entityId: account.id,
    });
    return account;
  });
  return right(created);
}
