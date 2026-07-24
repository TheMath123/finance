import { type Either, left, right } from '@finance/shared';
import type { ExpenseSplit } from '../../../domain/entities/expense-split';
import type { UseCaseDeps } from '../../deps';
import type { SplitError } from './errors';

/**
 * Cancelamento só permitido enquanto NENHUMA parte foi paga/confirmada
 * (decisão de produto, M3-03) — soft-cancel, nunca mexe na transação
 * original da despesa.
 */
export async function cancelSplit(
  deps: Pick<UseCaseDeps, 'repos' | 'rateLimiter'>,
  actor: { userId: string },
  splitId: string
): Promise<Either<SplitError, ExpenseSplit>> {
  // Auditoria de segurança (2026-07-19): nenhuma rota monetária tinha rate limit própria.
  if (
    await deps.rateLimiter.isLimited(
      `split-cancel:${actor.userId}`,
      30,
      60 * 60_000
    )
  ) {
    return left('rate_limited');
  }

  const split = await deps.repos.expenseSplit.findById(splitId);
  if (!split || split.cancelledAt) return left('split_not_found');
  if (split.createdBy !== actor.userId) return left('not_creator');

  const shares = await deps.repos.splitShare.listBySplit(splitId);
  if (shares.some((s) => s.status !== 'pending'))
    return left('shares_already_settled');

  // Condicional (WHERE cancelled_at IS NULL) — undefined se um cancel concorrente já venceu a corrida.
  const cancelled = await deps.repos.expenseSplit.cancel(splitId);
  if (!cancelled) return left('split_not_found');
  return right(cancelled);
}
