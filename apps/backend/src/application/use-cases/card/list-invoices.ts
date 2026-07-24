import type { InvoiceStatus } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { CardInvoice } from '../../../domain/entities/card';
import { effectiveStatus } from '../../../domain/services/invoice-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CardError } from './errors';

export interface InvoiceView extends CardInvoice {
  total: number;
  effectiveStatus: InvoiceStatus;
}

export async function listInvoices(
  deps: UseCaseDeps,
  actor: Actor,
  cardId: string
): Promise<Either<CardError, InvoiceView[]>> {
  const card = await deps.repos.card.findInWorkspace(actor.workspaceId, cardId);
  if (!card) return left('card_not_found');

  const rows = await deps.repos.invoice.listByCard(cardId);

  const views: InvoiceView[] = [];
  for (const invoice of rows) {
    const status = effectiveStatus(invoice, card.closingDay);
    // Transição persistida oportunisticamente no primeiro toque (regra do spec)
    if (status !== invoice.status) {
      await deps.repos.invoice.setStatus(invoice.id, status);
    }
    views.push({
      ...invoice,
      status,
      effectiveStatus: status,
      total: await deps.repos.invoice.total(invoice.id),
    });
  }
  return right(views);
}
