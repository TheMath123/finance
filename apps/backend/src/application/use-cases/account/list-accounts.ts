import type { BankAccount } from "../../../domain/entities/bank-account";
import type { Actor, UseCaseDeps } from "../../deps";

export interface AccountWithBalance extends BankAccount {
  /** Saldo derivado: initial_balance + Σ transações (regra do spec). */
  balance: number;
  /** Código do catálogo do banco — evita o app precisar buscar a lista de bancos à parte. */
  bankCode: string;
}

export async function listAccounts(deps: UseCaseDeps, actor: Actor): Promise<AccountWithBalance[]> {
  const [accounts, banks] = await Promise.all([
    deps.repos.account.listByWorkspace(actor.workspaceId),
    deps.repos.bank.listByWorkspace(actor.workspaceId),
  ]);
  const bankCodeById = new Map(banks.map((bank) => [bank.id, bank.bankCode]));

  return Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balance: account.initialBalance + (await deps.repos.transaction.balanceDelta(account.id)),
      bankCode: bankCodeById.get(account.bankId) ?? "other",
    })),
  );
}
