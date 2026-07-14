import { and, eq, isNull } from "drizzle-orm";
import { bankAccounts, cardInvoices, categories, transactions } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { invoiceTotal } from "../../../lib/invoices";
import { normalizeDescription } from "../../transaction/services/helpers";
import type { PayInvoiceInput } from "../schemas";
import type { CardError } from "../errors";
import { findWorkspaceCard, type InvoiceView } from "./shared";

/**
 * Pagamento de fatura (regra do spec): cria transação de despesa na conta escolhida,
 * vincula via payment_transaction_id e marca como paid.
 */
export async function payInvoice(
  deps: DbDeps,
  actor: Actor,
  invoiceId: string,
  input: PayInvoiceInput,
): Promise<Either<CardError, InvoiceView>> {
  const invoice = await deps.db.query.cardInvoices.findFirst({
    where: and(eq(cardInvoices.id, invoiceId), eq(cardInvoices.workspaceId, actor.workspaceId)),
  });
  if (!invoice) return left("invoice_not_found");
  if (invoice.status === "paid") return left("invoice_already_paid");

  const card = await findWorkspaceCard(deps.db, actor.workspaceId, invoice.cardId);
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
