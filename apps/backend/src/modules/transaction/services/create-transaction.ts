import { and, eq, isNull } from "drizzle-orm";
import { cards, transactions, type Transaction } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { TransactionMethod, TransactionType } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import {
  addMonths,
  competencePeriod,
  getOrCreateInvoice,
  splitInstallments,
} from "../../../lib/invoices";
import type { TransactionError } from "../errors";
import { assertActiveAccount, assertCategory, normalizeDescription } from "./helpers";

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
  /** Preenchido quando a transação materializa uma recorrência confirmada. */
  recurringId?: string;
}

export async function createTransaction(
  deps: DbDeps,
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
    recurringId: input.recurringId ?? null,
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
