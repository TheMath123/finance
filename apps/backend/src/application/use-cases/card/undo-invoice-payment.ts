import { type Either, left, right } from '@finance/shared';
import { effectiveStatus } from '../../../domain/services/invoice-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CardError } from './errors';
import type { InvoiceView } from './list-invoices';

/** Sinaliza dentro do `uow.run` que a fatura já foi desfeita por outra chamada entre a leitura e o commit (corrida). */
class AlreadyUnpaidError extends Error {}

/**
 * Reverso de payInvoice: desfaz um pagamento lançado por engano. Devolve a
 * fatura pro status que teria sem o pagamento (open/closed, recalculado por
 * `effectiveStatus`) e exclui (soft delete) a transação de pagamento criada
 * na conta — sem isso sobraria um gasto fantasma sem fatura paga por trás.
 */
export async function undoInvoicePayment(
  deps: UseCaseDeps,
  actor: Actor,
  invoiceId: string
): Promise<Either<CardError, InvoiceView>> {
  const invoice = await deps.repos.invoice.findInWorkspace(
    actor.workspaceId,
    invoiceId
  );
  if (!invoice) return left('invoice_not_found');
  if (invoice.status !== 'paid') return left('invoice_not_paid');

  const card = await deps.repos.card.findInWorkspace(
    actor.workspaceId,
    invoice.cardId
  );
  if (!card) return left('card_not_found');

  const targetStatus = effectiveStatus(
    {
      status: 'open',
      monthReference: invoice.monthReference,
      yearReference: invoice.yearReference,
    },
    card.closingDay
  );

  try {
    const reverted = await deps.uow.run(async (repos) => {
      const updated = await repos.invoice.unmarkPaid(invoiceId, targetStatus);
      if (!updated) throw new AlreadyUnpaidError();

      if (invoice.paymentTransactionId) {
        await repos.transaction.softDelete(invoice.paymentTransactionId);
        await repos.audit.record({
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: 'delete',
          entity: 'transaction',
          entityId: invoice.paymentTransactionId,
        });
      }

      await repos.audit.record({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: 'update',
        entity: 'card_invoice',
        entityId: updated.id,
      });
      return updated;
    });

    const total = await deps.repos.invoice.total(invoiceId);
    return right({
      ...reverted,
      total,
      effectiveStatus: effectiveStatus(reverted, card.closingDay),
    });
  } catch (error) {
    if (error instanceof AlreadyUnpaidError) return left('invoice_not_paid');
    throw error;
  }
}
