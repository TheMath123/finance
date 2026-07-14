import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import {
  bankAccounts,
  cardInvoices,
  cards,
  categories,
  transactions,
  type Db,
  type Transaction,
} from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { TransactionMethod, TransactionType } from "@finance/shared";
import { recordAudit } from "../../lib/audit";
import type { Actor } from "../../lib/http";
import {
  addMonths,
  competencePeriod,
  getOrCreateInvoice,
  splitInstallments,
} from "../../lib/invoices";

export type TransactionError =
  | "category_not_found"
  | "account_not_found"
  | "card_not_found"
  | "transaction_not_found"
  | "invalid_method_fields"
  | "invoice_paid"
  | "installment_field_locked";

export interface TransactionDeps {
  db: Db;
}

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  date: string; // YYYY-MM-DD (competência, America/Sao_Paulo)
  categoryId: string;
  accountId?: string;
  toAccountId?: string;
  cardId?: string;
  /** Apenas method=credit; 1 = à vista. */
  installments?: number;
}

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  categoryId?: string;
  date?: string;
}

/** lowercase + sem acentos — chave do cache de categorização e da busca (spec). */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

async function assertCategory(db: Db, workspaceId: string, categoryId: string) {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.workspaceId, workspaceId)),
  });
}

async function assertActiveAccount(db: Db, workspaceId: string, accountId: string) {
  return db.query.bankAccounts.findFirst({
    where: and(
      eq(bankAccounts.id, accountId),
      eq(bankAccounts.workspaceId, workspaceId),
      isNull(bankAccounts.archivedAt),
    ),
  });
}

export async function createTransaction(
  deps: TransactionDeps,
  actor: Actor,
  input: CreateTransactionInput,
): Promise<Either<TransactionError, Transaction[]>> {
  const { db } = deps;

  const category = await assertCategory(db, actor.workspaceId, input.categoryId);
  if (!category) return left("category_not_found");

  const base = {
    workspaceId: actor.workspaceId,
    createdBy: actor.userId,
    description: input.description,
    descriptionNormalized: normalizeDescription(input.description),
    type: input.type,
    method: input.method,
    date: input.date,
    categoryId: input.categoryId,
    source: "app" as const,
  };

  // Transferência: conta origem + destino, neutra (convenção: type=expense)
  if (input.method === "transfer") {
    if (!input.accountId || !input.toAccountId || input.accountId === input.toAccountId) {
      return left("invalid_method_fields");
    }
    const [from, to] = await Promise.all([
      assertActiveAccount(db, actor.workspaceId, input.accountId),
      assertActiveAccount(db, actor.workspaceId, input.toAccountId),
    ]);
    if (!from || !to) return left("account_not_found");

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(transactions)
        .values({
          ...base,
          type: "expense",
          amount: input.amount,
          accountId: input.accountId,
          toAccountId: input.toAccountId,
        })
        .returning();
      if (!row) throw new Error("falha ao criar transferência");
      await recordAudit(tx, {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "create",
        entity: "transaction",
        entityId: row.id,
      });
      return [row];
    });
    return right(created);
  }

  // Crédito: cartão + fatura lazy por competência; parcelas em faturas consecutivas
  if (input.method === "credit") {
    if (!input.cardId || input.accountId || input.toAccountId) {
      return left("invalid_method_fields");
    }
    const card = await db.query.cards.findFirst({
      where: and(
        eq(cards.id, input.cardId),
        eq(cards.workspaceId, actor.workspaceId),
        isNull(cards.archivedAt),
      ),
    });
    if (!card) return left("card_not_found");

    const count = input.installments ?? 1;
    const amounts = splitInstallments(input.amount, count);
    const firstPeriod = competencePeriod(input.date, card.closingDay);
    const groupId = count > 1 ? crypto.randomUUID() : null;

    const result = await db.transaction(async (tx) => {
      const rows: Transaction[] = [];
      for (let i = 0; i < count; i++) {
        const invoice = await getOrCreateInvoice(
          tx,
          actor.workspaceId,
          card.id,
          addMonths(firstPeriod, i),
        );
        if (invoice.status === "paid") return "invoice_paid" as const;
        const [row] = await tx
          .insert(transactions)
          .values({
            ...base,
            amount: amounts[i]!,
            cardId: card.id,
            invoiceId: invoice.id,
            installmentNumber: count > 1 ? i + 1 : null,
            installmentTotal: count > 1 ? count : null,
            installmentGroupId: groupId,
          })
          .returning();
        if (!row) throw new Error("falha ao criar transação de crédito");
        await recordAudit(tx, {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "create",
          entity: "transaction",
          entityId: row.id,
        });
        rows.push(row);
      }
      return rows;
    });
    if (result === "invoice_paid") return left("invoice_paid");
    return right(result);
  }

  // Demais métodos (pix/debit/cash): conta obrigatória
  if (!input.accountId || input.cardId || input.toAccountId) {
    return left("invalid_method_fields");
  }
  const account = await assertActiveAccount(db, actor.workspaceId, input.accountId);
  if (!account) return left("account_not_found");

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(transactions)
      .values({ ...base, amount: input.amount, accountId: input.accountId })
      .returning();
    if (!row) throw new Error("falha ao criar transação");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "transaction",
      entityId: row.id,
    });
    return [row];
  });
  return right(created);
}

async function loadTransaction(db: Db, workspaceId: string, id: string) {
  return db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.workspaceId, workspaceId)),
  });
}

/** Transação em fatura paga é imutável (correção via estorno — regra do spec). */
async function isInPaidInvoice(db: Db, tx: Transaction): Promise<boolean> {
  if (!tx.invoiceId) return false;
  const invoice = await db.query.cardInvoices.findFirst({
    where: eq(cardInvoices.id, tx.invoiceId),
  });
  return invoice?.status === "paid";
}

export async function updateTransaction(
  deps: TransactionDeps,
  actor: Actor,
  id: string,
  input: UpdateTransactionInput,
): Promise<Either<TransactionError, Transaction>> {
  const { db } = deps;
  const existing = await loadTransaction(db, actor.workspaceId, id);
  if (!existing || existing.deletedAt) return left("transaction_not_found");
  if (await isInPaidInvoice(db, existing)) return left("invoice_paid");

  // Parcelas: valor e data são travados (mudaria a soma do grupo/fatura); descrição/categoria ok
  if (existing.installmentGroupId && (input.amount !== undefined || input.date !== undefined)) {
    return left("installment_field_locked");
  }

  if (input.categoryId) {
    const category = await assertCategory(db, actor.workspaceId, input.categoryId);
    if (!category) return left("category_not_found");
  }

  const patch: Partial<typeof transactions.$inferInsert> = {};
  if (input.description !== undefined) {
    patch.description = input.description;
    patch.descriptionNormalized = normalizeDescription(input.description);
  }
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.date !== undefined) patch.date = input.date;

  // Crédito com mudança de data: recalcula a fatura de competência
  if (input.date !== undefined && existing.method === "credit" && existing.cardId) {
    const card = await db.query.cards.findFirst({ where: eq(cards.id, existing.cardId) });
    if (!card) return left("card_not_found");
    const invoice = await getOrCreateInvoice(
      db,
      actor.workspaceId,
      card.id,
      competencePeriod(input.date, card.closingDay),
    );
    if (invoice.status === "paid") return left("invoice_paid");
    patch.invoiceId = invoice.id;
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(transactions)
      .set(patch)
      .where(eq(transactions.id, existing.id))
      .returning();
    if (!row) throw new Error("falha ao atualizar transação");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "transaction",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}

/** Soft delete; compra parcelada exclui todas as parcelas não pagas (regra do spec). */
export async function deleteTransaction(
  deps: TransactionDeps,
  actor: Actor,
  id: string,
): Promise<Either<TransactionError, { deletedIds: string[] }>> {
  const { db } = deps;
  const existing = await loadTransaction(db, actor.workspaceId, id);
  if (!existing || existing.deletedAt) return left("transaction_not_found");
  if (await isInPaidInvoice(db, existing)) return left("invoice_paid");

  const deletedIds = await db.transaction(async (tx) => {
    let targets: Transaction[];
    if (existing.installmentGroupId) {
      const group = await tx.query.transactions.findMany({
        where: and(
          eq(transactions.installmentGroupId, existing.installmentGroupId),
          isNull(transactions.deletedAt),
        ),
      });
      // Só as parcelas cuja fatura não está paga
      const unpaid: Transaction[] = [];
      for (const t of group) {
        if (!(await isInPaidInvoice(db, t))) unpaid.push(t);
      }
      targets = unpaid;
    } else {
      targets = [existing];
    }

    const ids: string[] = [];
    for (const t of targets) {
      await tx
        .update(transactions)
        .set({ deletedAt: new Date() })
        .where(eq(transactions.id, t.id));
      await recordAudit(tx, {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "delete",
        entity: "transaction",
        entityId: t.id,
      });
      ids.push(t.id);
    }
    return ids;
  });
  return right({ deletedIds });
}

export async function restoreTransaction(
  deps: TransactionDeps,
  actor: Actor,
  id: string,
): Promise<Either<TransactionError, Transaction>> {
  const { db } = deps;
  const existing = await loadTransaction(db, actor.workspaceId, id);
  if (!existing || !existing.deletedAt) return left("transaction_not_found");

  const restored = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(transactions)
      .set({ deletedAt: null })
      .where(eq(transactions.id, existing.id))
      .returning();
    if (!row) throw new Error("falha ao restaurar transação");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "restore",
      entity: "transaction",
      entityId: row.id,
    });
    return row;
  });
  return right(restored);
}

export interface ListTransactionsFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  createdBy?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listTransactions(
  deps: TransactionDeps,
  actor: Actor,
  filters: ListTransactionsFilters,
): Promise<Transaction[]> {
  const conditions = [
    eq(transactions.workspaceId, actor.workspaceId),
    isNull(transactions.deletedAt),
  ];
  if (filters.from) conditions.push(gte(transactions.date, filters.from));
  if (filters.to) conditions.push(lte(transactions.date, filters.to));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.cardId) conditions.push(eq(transactions.cardId, filters.cardId));
  if (filters.createdBy) conditions.push(eq(transactions.createdBy, filters.createdBy));
  if (filters.accountId) {
    conditions.push(
      or(
        eq(transactions.accountId, filters.accountId),
        eq(transactions.toAccountId, filters.accountId),
      )!,
    );
  }
  if (filters.q) {
    conditions.push(
      ilike(transactions.descriptionNormalized, `%${normalizeDescription(filters.q)}%`),
    );
  }

  return deps.db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit: Math.min(filters.limit ?? 50, 200),
    offset: filters.offset ?? 0,
  });
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
        or(
          eq(transactions.accountId, accountId),
          eq(transactions.toAccountId, accountId),
        ),
      ),
    );
  return account.initialBalance + Number(row?.delta ?? 0);
}
