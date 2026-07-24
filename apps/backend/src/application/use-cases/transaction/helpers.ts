import type { Transaction } from '../../../domain/entities/transaction';
import type { Repositories } from '../../ports/repositories';

/** Transação em fatura paga é imutável (correção via estorno — regra do spec). */
export async function isInPaidInvoice(
  repos: Repositories,
  tx: Transaction
): Promise<boolean> {
  if (!tx.invoiceId) return false;
  const invoice = await repos.invoice.findById(tx.invoiceId);
  return invoice?.status === 'paid';
}
