import { and, desc, eq, isNull } from "drizzle-orm";
import {
  bankAccounts,
  banks,
  cardInvoices,
  cards,
  categories,
  transactions,
  type Card,
  type CardInvoice,
  type Db,
} from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { InvoiceStatus } from "@finance/shared";
import { recordAudit } from "../../lib/audit";
import type { Actor } from "../../lib/http";
import { effectiveStatus, invoiceTotal, unpaidInvoicesTotal } from "../../lib/invoices";
import { normalizeDescription } from "../transaction/service";

export type CardError =
  | "bank_not_found"
  | "card_not_found"
  | "card_has_transactions"
  | "invoice_not_found"
  | "invoice_already_paid"
  | "invoice_empty"
  | "account_not_found";

export interface CardDeps {
  db: Db;
}

export interface CardInput {
  name: string;
  bankId: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

export async function createCard(
  deps: CardDeps,
  actor: Actor,
  input: CardInput,
): Promise<Either<CardError, Card>> {
  const bank = await deps.db.query.banks.findFirst({
    where: and(eq(banks.id, input.bankId), eq(banks.workspaceId, actor.workspaceId)),
  });
  if (!bank) return left("bank_not_found");

  const created = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(cards)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning();
    if (!row) throw new Error("falha ao criar cartão");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "card",
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}

export interface CardWithLimit extends Card {
  /** limit − Σ(faturas não pagas) — derivado (regra do spec). */
  availableLimit: number;
}

export async function listCards(deps: CardDeps, actor: Actor): Promise<CardWithLimit[]> {
  const rows = await deps.db.query.cards.findMany({
    where: eq(cards.workspaceId, actor.workspaceId),
  });
  return Promise.all(
    rows.map(async (card) => ({
      ...card,
      availableLimit: card.limit - (await unpaidInvoicesTotal(deps.db, card.id)),
    })),
  );
}

export async function updateCard(
  deps: CardDeps,
  actor: Actor,
  cardId: string,
  input: Partial<CardInput>,
): Promise<Either<CardError, Card>> {
  const existing = await deps.db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.workspaceId, actor.workspaceId)),
  });
  if (!existing) return left("card_not_found");
  if (input.bankId) {
    const bank = await deps.db.query.banks.findFirst({
      where: and(eq(banks.id, input.bankId), eq(banks.workspaceId, actor.workspaceId)),
    });
    if (!bank) return left("bank_not_found");
  }

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx.update(cards).set(input).where(eq(cards.id, cardId)).returning();
    if (!row) throw new Error("falha ao atualizar cartão");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "card",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}

/** Cartão com transações não é deletável — arquiva (regra do spec). */
export async function archiveCard(
  deps: CardDeps,
  actor: Actor,
  cardId: string,
  archived: boolean,
): Promise<Either<CardError, Card>> {
  const existing = await deps.db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.workspaceId, actor.workspaceId)),
  });
  if (!existing) return left("card_not_found");

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(cards)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(cards.id, cardId))
      .returning();
    if (!row) throw new Error("falha ao arquivar cartão");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "card",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}

export async function deleteCard(
  deps: CardDeps,
  actor: Actor,
  cardId: string,
): Promise<Either<CardError, null>> {
  const existing = await deps.db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.workspaceId, actor.workspaceId)),
  });
  if (!existing) return left("card_not_found");

  const hasTransaction = await deps.db.query.transactions.findFirst({
    where: eq(transactions.cardId, cardId),
  });
  if (hasTransaction) return left("card_has_transactions");

  await deps.db.transaction(async (tx) => {
    await tx.delete(cardInvoices).where(eq(cardInvoices.cardId, cardId));
    await tx.delete(cards).where(eq(cards.id, cardId));
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "card",
      entityId: cardId,
    });
  });
  return right(null);
}

export interface InvoiceView extends CardInvoice {
  total: number;
  effectiveStatus: InvoiceStatus;
}

export async function listInvoices(
  deps: CardDeps,
  actor: Actor,
  cardId: string,
): Promise<Either<CardError, InvoiceView[]>> {
  const card = await deps.db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.workspaceId, actor.workspaceId)),
  });
  if (!card) return left("card_not_found");

  const rows = await deps.db.query.cardInvoices.findMany({
    where: eq(cardInvoices.cardId, cardId),
    orderBy: [desc(cardInvoices.yearReference), desc(cardInvoices.monthReference)],
  });

  const views: InvoiceView[] = [];
  for (const invoice of rows) {
    const status = effectiveStatus(invoice, card.closingDay);
    // Transição persistida oportunisticamente no primeiro toque (regra do spec)
    if (status !== invoice.status) {
      await deps.db.update(cardInvoices).set({ status }).where(eq(cardInvoices.id, invoice.id));
    }
    views.push({
      ...invoice,
      status,
      effectiveStatus: status,
      total: await invoiceTotal(deps.db, invoice.id),
    });
  }
  return right(views);
}

/**
 * Pagamento de fatura (regra do spec): cria transação de despesa na conta escolhida,
 * vincula via payment_transaction_id e marca como paid.
 */
export async function payInvoice(
  deps: CardDeps,
  actor: Actor,
  invoiceId: string,
  input: { accountId: string; date: string; method: "pix" | "debit" },
): Promise<Either<CardError, InvoiceView>> {
  const invoice = await deps.db.query.cardInvoices.findFirst({
    where: and(eq(cardInvoices.id, invoiceId), eq(cardInvoices.workspaceId, actor.workspaceId)),
  });
  if (!invoice) return left("invoice_not_found");
  if (invoice.status === "paid") return left("invoice_already_paid");

  const card = await deps.db.query.cards.findFirst({ where: eq(cards.id, invoice.cardId) });
  if (!card) return left("card_not_found");

  const account = await deps.db.query.bankAccounts.findFirst({
    where: and(
      eq(bankAccounts.id, input.accountId),
      eq(bankAccounts.workspaceId, actor.workspaceId),
      isNull(bankAccounts.archivedAt),
    ),
  });
  if (!account) return left("account_not_found");

  const total = await invoiceTotal(deps.db, invoiceId);
  if (total <= 0) return left("invoice_empty");

  const fallback = await deps.db.query.categories.findFirst({
    where: and(eq(categories.workspaceId, actor.workspaceId), eq(categories.isFallback, true)),
  });
  if (!fallback) throw new Error("workspace sem categoria fallback");

  const description = `Pagamento fatura ${card.name} ${String(invoice.monthReference).padStart(2, "0")}/${invoice.yearReference}`;

  const paid = await deps.db.transaction(async (tx) => {
    const [payment] = await tx
      .insert(transactions)
      .values({
        workspaceId: actor.workspaceId,
        createdBy: actor.userId,
        description,
        descriptionNormalized: normalizeDescription(description),
        amount: total,
        type: "expense",
        method: input.method,
        date: input.date,
        categoryId: fallback.id,
        accountId: input.accountId,
      })
      .returning();
    if (!payment) throw new Error("falha ao criar transação de pagamento");

    const [updated] = await tx
      .update(cardInvoices)
      .set({ status: "paid", paymentTransactionId: payment.id })
      .where(eq(cardInvoices.id, invoiceId))
      .returning();
    if (!updated) throw new Error("falha ao marcar fatura como paga");

    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "transaction",
      entityId: payment.id,
    });
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "card_invoice",
      entityId: updated.id,
    });
    return updated;
  });

  return right({ ...paid, total, effectiveStatus: "paid" });
}
