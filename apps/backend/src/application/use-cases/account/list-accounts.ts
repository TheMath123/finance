import type { BankAccount } from "../../../domain/entities/bank-account";
import type { Actor, UseCaseDeps } from "../../deps";

export interface AccountWithBalance extends BankAccount {
  /** Saldo derivado: initial_balance + Σ transações (regra do spec). */
  balance: number;
}

export async function listAccounts(deps: UseCaseDeps, actor: Actor): Promise<AccountWithBalance[]> {
  const accounts = await deps.repos.account.listByWorkspace(actor.workspaceId);
  return Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balance: account.initialBalance + (await deps.repos.transaction.balanceDelta(account.id)),
    })),
  );
}
