import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

/**
 * Remove o avatar enviado manualmente (M5-07) — nunca a conta. Depois de
 * remover, `resolveAvatarUrl` volta a expor o `avatarUrl` do Google
 * automaticamente, se o usuário tiver um vínculo.
 */
export async function removeAvatar(
  deps: Pick<UseCaseDeps, 'repos' | 'storage'>,
  userId: string
): Promise<Either<AuthError, null>> {
  const user = await deps.repos.user.findById(userId);
  if (!user) throw new Error('usuário autenticado não encontrado');
  if (!user.avatarKey) return left('avatar_not_found');

  await deps.storage.delete(user.avatarKey);
  await deps.repos.user.updateAvatarKey(userId, null);

  return right(null);
}
