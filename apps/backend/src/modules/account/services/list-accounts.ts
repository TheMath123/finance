import { eq } from "drizzle-orm";
import { bankAccounts, type BankAccount } from "@finance/db";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { accountBalance } from "../../transaction/services/helpers";

export interface AccountWithBalance extends BankAccount {
  /** Saldo derivado: initial_balance + Σ transações (regra do spec). */
  balance: number;
}

export async function listAccounts(deps: DbDeps, actor: Actor): Promise<AccountWithBalance[]> {
  const rows = await deps.db.query.bankAccounts.findMany({
    where: eq(bankAccounts.workspaceId, actor.workspaceId),
  });
  return Promise.all(
    rows.map(async (account) => ({
      ...account,
      balance: await accountBalance(deps.db, account.id),
    })),
  );
}
