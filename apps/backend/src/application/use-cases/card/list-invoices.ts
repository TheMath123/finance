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

export interface ListInvoicesFilters {
  limit?: number;
  offset?: number;
  month?: number;
  year?: number;
}

export interface ListInvoicesOutput {
  invoices: InvoiceView[];
  total: number;
  /** Fatura não paga mais antiga — destaque da tela ("quanto devo agora"), independente de página/filtro. */
  current: InvoiceView | null;
}

export async function listInvoices(
  deps: UseCaseDeps,
  actor: Actor,
  cardId: string,
  filters: ListInvoicesFilters = {}
): Promise<Either<CardError, ListInvoicesOutput>> {
  const card = await deps.repos.card.findInWorkspace(actor.workspaceId, cardId);
  if (!card) return left('card_not_found');
  const closingDay = card.closingDay;

  async function toView(invoice: CardInvoice): Promise<InvoiceView> {
    const status = effectiveStatus(invoice, closingDay);
    // Transição persistida oportunisticamente no primeiro toque (regra do spec)
    if (status !== invoice.status) {
      await deps.repos.invoice.setStatus(invoice.id, status);
    }
    return {
      ...invoice,
      status,
      effectiveStatus: status,
      total: await deps.repos.invoice.total(invoice.id),
    };
  }

  const [{ invoices: pageRows, total }, oldestUnpaid] = await Promise.all([
    deps.repos.invoice.listByCardPaginated(cardId, {
      limit: filters.limit,
      offset: filters.offset,
      month: filters.month,
      year: filters.year,
    }),
    deps.repos.invoice.findOldestUnpaid(cardId),
  ]);

  const invoices = await Promise.all(pageRows.map(toView));
  const current = oldestUnpaid
    ? (invoices.find((v) => v.id === oldestUnpaid.id) ??
      (await toView(oldestUnpaid)))
    : null;

  return right({ invoices, total, current });
}
