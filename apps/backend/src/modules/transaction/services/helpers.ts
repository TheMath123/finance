import { and, eq, isNull, or, sql } from "drizzle-orm";
import {
  bankAccounts,
  cardInvoices,
  categories,
  transactions,
  type Db,
  type Transaction,
} from "@finance/db";

/** lowercase + sem acentos — chave do cache de categorização e da busca (spec). */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function assertCategory(db: Db, workspaceId: string, categoryId: string) {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)),
  });
}

export async function assertActiveAccount(db: Db, workspaceId: string, accountId: string) {
  return db.query.bankAccounts.findFirst({
    where: and(
      eq(bankAccounts.id, accountId),
      eq(bankAccounts.workspaceId, workspaceId),
      isNull(bankAccounts.archivedAt),
    ),
  });
}

export async function loadTransaction(db: Db, workspaceId: string, id: string) {
  return db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.workspaceId, workspaceId)),
  });
}

/** Transação em fatura paga é imutável (correção via estorno — regra do spec). */
export async function isInPaidInvoice(db: Db, tx: Transaction): Promise<boolean> {
  if (!tx.invoiceId) return false;
  const invoice = await db.query.cardInvoices.findFirst({
    where: eq(cardInvoices.id, tx.invoiceId),
  });
  return invoice?.status === "paid";
}

/** Saldo derivado da conta: initial_balance + Σ efeitos (regra do spec — nada armazenado). */
export async function accountBalance(db: Db, accountId: string): Promise<number> {
  const account = await db.query.bankAccounts.findFirst({
    where: eq(bankAccounts.id, accountId),
  });
  if (!account) return 0;

  const [row] = await db
    .select({
      delta: sql<string>`COALESCE(SUM(
        CASE
          WHEN ${transactions.toAccountId} = ${accountId} THEN ${transactions.amount}
          WHEN ${transactions.method} = 'transfer' THEN -${transactions.amount}
          WHEN ${transactions.type} = 'income' THEN ${transactions.amount}
          ELSE -${transactions.amount}
        END
      ), 0)`,
    })
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        or(eq(transactions.accountId, accountId), eq(transactions.toAccountId, accountId)),
      ),
    );
  return account.initialBalance + Number(row?.delta ?? 0);
}
