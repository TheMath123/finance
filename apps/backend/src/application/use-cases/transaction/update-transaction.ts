import { left, right, type Either } from "@finance/shared";
import type { Transaction } from "../../../domain/entities/transaction";
import { competencePeriod } from "../../../domain/services/invoice-rules";
import { normalizeDescription } from "../../../domain/services/occurrence-rules";
import type { Actor, UseCaseDeps } from "../../deps";
import type { TransactionPatch } from "../../ports/transaction-repository";
import type { TransactionError } from "./errors";
import { isInPaidInvoice } from "./helpers";

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  categoryId?: string;
  date?: string;
}

export async function updateTransaction(
  deps: UseCaseDeps,
  actor: Actor,
  id: string,
  input: UpdateTransactionInput,
): Promise<Either<TransactionError, Transaction>> {
  const existing = await deps.repos.transaction.findInWorkspace(actor.workspaceId, id);
  if (!existing || existing.deletedAt) return left("transaction_not_found");
  if (await isInPaidInvoice(deps.repos, existing)) return left("invoice_paid");

  // Parcelas: valor e data são travados (mudaria a soma do grupo/fatura); descrição/categoria ok
  if (existing.installmentGroupId && (input.amount !== undefined || input.date !== undefined)) {
    return left("installment_field_locked");
  }

  if (input.categoryId) {
    const category = await deps.repos.category.findInWorkspace(actor.workspaceId, input.categoryId);
    if (!category) return left("category_not_found");
  }

  const patch: TransactionPatch = {};
  if (input.description !== undefined) {
    patch.description = input.description;
    patch.descriptionNormalized = normalizeDescription(input.description);
  }
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.date !== undefined) patch.date = input.date;

  // Crédito com mudança de data: recalcula a fatura de competência
  if (input.date !== undefined && existing.method === "credit" && existing.cardId) {
    const card = await deps.repos.card.findInWorkspace(actor.workspaceId, existing.cardId);
    if (!card) return left("card_not_found");
    const invoice = await deps.repos.invoice.getOrCreate(
      actor.workspaceId,
      card.id,
      competencePeriod(input.date, card.closingDay),
    );
    if (invoice.status === "paid") return left("invoice_paid");
    patch.invoiceId = invoice.id;
  }

  try {
    const updated = await deps.uow.run(async (repos) => {
      // Auditoria (2026-07-19): re-checa dentro da transação — a fatura pode ter
      // sido paga entre o check acima e este ponto.
      if (await isInPaidInvoice(repos, existing)) throw new InvoiceNowPaidError();
      const row = await repos.transaction.update(existing.id, patch);
      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "update",
        entity: "transaction",
        entityId: row.id,
      });
      return row;
    });
    return right(updated);
  } catch (error) {
    if (error instanceof InvoiceNowPaidError) return left("invoice_paid");
    throw error;
  }
}

class InvoiceNowPaidError extends Error {}
