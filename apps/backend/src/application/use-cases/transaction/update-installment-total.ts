import { type Either, left, right } from '@finance/shared';
import type { Transaction } from '../../../domain/entities/transaction';
import { splitInstallments } from '../../../domain/services/invoice-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { Repositories } from '../../ports/repositories';
import type { TransactionError } from './errors';
import { isInPaidInvoice } from './helpers';

/**
 * Editar o valor de uma compra parcelada não mexe parcela por parcela
 * (ficaria sem nenhum vínculo com o total real da compra) — o usuário
 * informa o novo valor TOTAL, e a redistribuição usa a mesma regra de
 * `splitInstallments` da criação (resto na primeira), só que aplicada
 * apenas às parcelas ainda não pagas. Parcelas pagas são imutáveis (regra
 * do spec, estorno é o caminho) e ficam fora da redistribuição — o valor
 * já pago é descontado do novo total antes de dividir o restante.
 */
export async function updateInstallmentTotal(
  deps: UseCaseDeps,
  actor: Actor,
  id: string,
  newTotalAmount: number
): Promise<Either<TransactionError, Transaction[]>> {
  const existing = await deps.repos.transaction.findInWorkspace(
    actor.workspaceId,
    id
  );
  if (!existing || existing.deletedAt) return left('transaction_not_found');
  if (!existing.installmentGroupId) return left('not_installment_purchase');
  // Mesma regra de excluir grupo (delete-transaction): iniciar a partir de
  // uma parcela já paga é rejeitado — o usuário precisa clicar numa parcela
  // ainda aberta pra disparar a redistribuição do restante.
  if (await isInPaidInvoice(deps.repos, existing)) return left('invoice_paid');

  try {
    const updated = await deps.uow.run(async (repos: Repositories) => {
      const group = await repos.transaction.listByGroup(
        existing.installmentGroupId!
      );
      const active = group.filter((t) => t.deletedAt === null);

      const paid: Transaction[] = [];
      const unpaid: Transaction[] = [];
      for (const t of active) {
        if (await isInPaidInvoice(repos, t)) paid.push(t);
        else unpaid.push(t);
      }

      // Auditoria: re-checa dentro da transação — a parcela informada pode
      // ter sido paga entre o check acima e este ponto.
      if (unpaid.length === 0) throw new InvoiceNowPaidError();

      const paidSum = paid.reduce((sum, t) => sum + t.amount, 0);
      const remaining = newTotalAmount - paidSum;
      if (remaining <= 0) throw new TotalBelowPaidError();

      const amounts = splitInstallments(remaining, unpaid.length);
      const rows: Transaction[] = [];
      for (let i = 0; i < unpaid.length; i++) {
        const row = await repos.transaction.update(unpaid[i]!.id, {
          amount: amounts[i]!,
        });
        await repos.audit.record({
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: 'update',
          entity: 'transaction',
          entityId: row.id,
        });
        rows.push(row);
      }
      return rows;
    });
    return right(updated);
  } catch (error) {
    if (error instanceof InvoiceNowPaidError) return left('invoice_paid');
    if (error instanceof TotalBelowPaidError)
      return left('total_below_paid_amount');
    throw error;
  }
}

class InvoiceNowPaidError extends Error {}
class TotalBelowPaidError extends Error {}
