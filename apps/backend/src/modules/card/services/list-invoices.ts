import { desc, eq } from "drizzle-orm";
import { cardInvoices } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { effectiveStatus, invoiceTotal } from "../../../lib/invoices";
import type { CardError } from "../errors";
import { findWorkspaceCard, type InvoiceView } from "./shared";

export async function listInvoices(
  deps: DbDeps,
  actor: Actor,
  cardId: string,
): Promise<Either<CardError, InvoiceView[]>> {
  const card = await findWorkspaceCard(deps.db, actor.workspaceId, cardId);
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
