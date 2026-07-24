import { type Either, left, right } from '@finance/shared';
import type { Transaction } from '../../../domain/entities/transaction';
import type { Actor, UseCaseDeps } from '../../deps';
import type { Repositories } from '../../ports/repositories';
import type { TransactionError } from './errors';
import { isInPaidInvoice } from './helpers';

/** Soft delete; compra parcelada exclui todas as parcelas não pagas (regra do spec). */
export async function deleteTransaction(
  deps: UseCaseDeps,
  actor: Actor,
  id: string
): Promise<Either<TransactionError, { deletedIds: string[] }>> {
  const existing = await deps.repos.transaction.findInWorkspace(
    actor.workspaceId,
    id
  );
  if (!existing || existing.deletedAt) return left('transaction_not_found');
  if (await isInPaidInvoice(deps.repos, existing)) return left('invoice_paid');

  try {
    const deletedIds = await deps.uow.run(async (repos: Repositories) => {
      let targets: Transaction[];
      if (existing.installmentGroupId) {
        const group = await repos.transaction.listByGroup(
          existing.installmentGroupId
        );
        const activeGroup = group.filter((t) => t.deletedAt === null);
        // Só as parcelas cuja fatura não está paga
        const unpaid: Transaction[] = [];
        for (const t of activeGroup) {
          if (!(await isInPaidInvoice(repos, t))) unpaid.push(t);
        }
        targets = unpaid;
      } else {
        // Auditoria (2026-07-19): re-checa dentro da transação — a fatura pode ter
        // sido paga entre o check acima e este ponto.
        if (await isInPaidInvoice(repos, existing))
          throw new InvoiceNowPaidError();
        targets = [existing];
      }

      const ids: string[] = [];
      for (const t of targets) {
        await repos.transaction.softDelete(t.id);
        await repos.audit.record({
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: 'delete',
          entity: 'transaction',
          entityId: t.id,
        });
        ids.push(t.id);
      }
      return ids;
    });
    return right({ deletedIds });
  } catch (error) {
    if (error instanceof InvoiceNowPaidError) return left('invoice_paid');
    throw error;
  }
}

class InvoiceNowPaidError extends Error {}
