import { eq } from "drizzle-orm";
import { cards, transactions, type Transaction } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { competencePeriod, getOrCreateInvoice } from "../../../lib/invoices";
import type { TransactionError } from "../errors";
import { assertCategory, isInPaidInvoice, loadTransaction, normalizeDescription } from "./helpers";

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  categoryId?: string;
  date?: string;
}

export async function updateTransaction(
  deps: DbDeps,
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
