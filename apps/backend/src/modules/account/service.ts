import { and, eq, or } from "drizzle-orm";
import { bankAccounts, banks, transactions, type BankAccount, type Db } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { AccountType } from "@finance/shared";
import { recordAudit } from "../../lib/audit";
import type { Actor } from "../../lib/http";
import { accountBalance } from "../transaction/service";

export type AccountError = "bank_not_found" | "account_not_found" | "account_has_transactions";

export interface AccountDeps {
  db: Db;
}

export interface AccountInput {
  name: string;
  bankId: string;
  type: AccountType;
  initialBalance: number;
}

export async function createAccount(
  deps: AccountDeps,
  actor: Actor,
  input: AccountInput,
): Promise<Either<AccountError, BankAccount>> {
  const bank = await deps.db.query.banks.findFirst({
    where: and(eq(banks.id, input.bankId), eq(banks.workspaceId, actor.workspaceId)),
  });
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

export interface AccountWithBalance extends BankAccount {
  /** Saldo derivado: initial_balance + Σ transações (regra do spec). */
  balance: number;
}

export async function listAccounts(
  deps: AccountDeps,
  actor: Actor,
): Promise<AccountWithBalance[]> {
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

export async function updateAccount(
  deps: AccountDeps,
  actor: Actor,
  accountId: string,
  input: Partial<AccountInput>,
): Promise<Either<AccountError, BankAccount>> {
  const existing = await deps.db.query.bankAccounts.findFirst({
    where: and(eq(bankAccounts.id, accountId), eq(bankAccounts.workspaceId, actor.workspaceId)),
  });
  if (!existing) return left("account_not_found");
  if (input.bankId) {
    const bank = await deps.db.query.banks.findFirst({
      where: and(eq(banks.id, input.bankId), eq(banks.workspaceId, actor.workspaceId)),
    });
    if (!bank) return left("bank_not_found");
  }

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(bankAccounts)
      .set(input)
      .where(eq(bankAccounts.id, accountId))
      .returning();
    if (!row) throw new Error("falha ao atualizar conta");
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

export async function archiveAccount(
  deps: AccountDeps,
  actor: Actor,
  accountId: string,
  archived: boolean,
): Promise<Either<AccountError, BankAccount>> {
  const existing = await deps.db.query.bankAccounts.findFirst({
    where: and(eq(bankAccounts.id, accountId), eq(bankAccounts.workspaceId, actor.workspaceId)),
  });
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

/** Conta com transações não é deletável — arquiva (regra do spec). */
export async function deleteAccount(
  deps: AccountDeps,
  actor: Actor,
  accountId: string,
): Promise<Either<AccountError, null>> {
  const existing = await deps.db.query.bankAccounts.findFirst({
    where: and(eq(bankAccounts.id, accountId), eq(bankAccounts.workspaceId, actor.workspaceId)),
  });
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
