import { left, right, type Either } from "@finance/shared";
import type { AccountType } from "@finance/shared";
import type { BankAccount } from "../../../domain/entities/bank-account";
import type { Actor, UseCaseDeps } from "../../deps";
import { findOrCreateBank } from "../bank/find-or-create-bank";
import type { AccountError } from "./errors";

export interface CreateAccountInput {
  name: string;
  /** Código do catálogo (spec: usuário não cadastra banco manualmente — o banco é resolvido por trás). */
  bankCode: string;
  type: AccountType;
  initialBalance: number;
}

export async function createAccount(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateAccountInput,
): Promise<Either<AccountError, BankAccount>> {
  const created = await deps.uow.run(async (repos) => {
    const bank = await findOrCreateBank(repos, actor.workspaceId, input.bankCode);
    if (!bank.ok) return bank;

    const account = await repos.account.create(actor.workspaceId, {
      name: input.name,
      bankId: bank.value.id,
      type: input.type,
      initialBalance: input.initialBalance,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "bank_account",
      entityId: account.id,
    });
    return right(account);
  });
  if (!created.ok) return left("invalid_bank_code");
  return created;
}
