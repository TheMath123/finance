import { type Either, left, right } from '@finance/shared';
import type { InterUserTransfer } from '../../../domain/entities/inter-user-transfer';
import type { UseCaseDeps } from '../../deps';
import type { TransferError } from './errors';

export async function rejectTransfer(
  deps: Pick<UseCaseDeps, 'repos' | 'rateLimiter'>,
  actor: { userId: string },
  transferId: string
): Promise<Either<TransferError, InterUserTransfer>> {
  // Auditoria de segurança (2026-07-19): nenhuma rota monetária tinha rate limit própria.
  if (
    await deps.rateLimiter.isLimited(
      `transfer-reject:${actor.userId}`,
      20,
      60 * 60_000
    )
  ) {
    return left('rate_limited');
  }

  const transfer = await deps.repos.interUserTransfer.findById(transferId);
  if (!transfer) return left('transfer_not_found');
  if (transfer.toUserId !== actor.userId) return left('not_recipient');
  if (transfer.status !== 'pending') return left('already_finalized');

  // Condicional (WHERE status='pending') — undefined se accept/reject concorrente já finalizou.
  const rejected = await deps.repos.interUserTransfer.reject(transferId);
  if (!rejected) return left('already_finalized');
  return right(rejected);
}
