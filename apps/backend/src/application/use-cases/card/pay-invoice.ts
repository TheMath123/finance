import { left, right, type Either } from "@finance/shared";
import { normalizeDescription } from "../../../domain/services/occurrence-rules";
import type { Actor, UseCaseDeps } from "../../deps";
import type { CardError } from "./errors";
import type { InvoiceView } from "./list-invoices";

export interface PayInvoiceInput {
  accountId: string;
  date: string;
  method: "pix" | "debit";
}

/** Sinaliza dentro do `uow.run` que a fatura já foi paga por outra chamada entre a leitura e o commit (corrida) — reverte o pagamento já criado. */
class AlreadyPaidError extends Error {}

/**
 * Pagamento de fatura (regra do spec): cria transação de despesa na conta escolhida,
 * vincula via payment_transaction_id e marca como paid.
 */
export async function payInvoice(
  deps: UseCaseDeps,
  actor: Actor,
  invoiceId: string,
  input: PayInvoiceInput,
): Promise<Either<CardError, InvoiceView>> {
  const invoice = await deps.repos.invoice.findInWorkspace(actor.workspaceId, invoiceId);
  if (!invoice) return left("invoice_not_found");
  if (invoice.status === "paid") return left("invoice_already_paid");

  const card = await deps.repos.card.findInWorkspace(actor.workspaceId, invoice.cardId);
  if (!card) return left("card_not_found");

  const account = await deps.repos.account.findActiveInWorkspace(actor.workspaceId, input.accountId);
  if (!account) return left("account_not_found");

  const total = await deps.repos.invoice.total(invoiceId);
  if (total <= 0) return left("invoice_empty");

  const fallback = await deps.repos.category.findFallback(actor.workspaceId);
  if (!fallback) throw new Error("workspace sem categoria fallback");

  const description = `Pagamento fatura ${card.name} ${String(invoice.monthReference).padStart(2, "0")}/${invoice.yearReference}`;

  try {
    const paid = await deps.uow.run(async (repos) => {
      const payment = await repos.transaction.create({
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
      });

      // Auditoria de segurança (2026-07-19): condicional (WHERE status <> 'paid') — se
      // outra chamada paralela já marcou a fatura paga primeiro, reverte a transação de
      // despesa acima em vez de deixar um pagamento duplicado registrado.
      const updated = await repos.invoice.markPaid(invoiceId, payment.id);
      if (!updated) throw new AlreadyPaidError();

      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "create",
        entity: "transaction",
        entityId: payment.id,
      });
      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "update",
        entity: "card_invoice",
        entityId: updated.id,
      });
      return updated;
    });

    return right({ ...paid, total, effectiveStatus: "paid" });
  } catch (error) {
    if (error instanceof AlreadyPaidError) return left("invoice_already_paid");
    throw error;
  }
}
