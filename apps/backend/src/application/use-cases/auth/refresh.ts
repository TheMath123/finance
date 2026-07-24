import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';
import { type AuthSession, issueSession } from './session';

export interface RefreshInput {
  refreshToken: string;
}

export async function refresh(
  deps: UseCaseDeps,
  input: RefreshInput
): Promise<Either<AuthError, AuthSession>> {
  const tokenHash = deps.tokens.hashOpaque(input.refreshToken);
  const stored = await deps.repos.token.findRefreshByHash(tokenHash);
  if (!stored) return left('invalid_token');

  // Rotação: o token usado é sempre invalidado, válido ou expirado
  await deps.repos.token.deleteRefreshById(stored.id);
  if (stored.expiresAt.getTime() <= Date.now()) return left('invalid_token');

  const user = await deps.repos.user.findById(stored.userId);
  if (!user?.defaultWorkspaceId) return left('invalid_token');

  return right(await issueSession(deps, user, user.defaultWorkspaceId));
}
