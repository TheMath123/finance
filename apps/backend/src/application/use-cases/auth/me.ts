import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

export interface MeOutput {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerifiedAt: string | null;
    /** E-mail novo aguardando confirmação por código (troca de e-mail no perfil), se houver. */
    pendingEmail: string | null;
    platformRole: import('@finance/shared').PlatformRole;
  };
  defaultWorkspaceId: string;
}

export async function me(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string
): Promise<Either<AuthError, MeOutput>> {
  const user = await deps.repos.user.findById(userId);
  if (!user?.defaultWorkspaceId) return left('invalid_token');

  return right({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerifiedAt: user.emailVerifiedAt
        ? user.emailVerifiedAt.toISOString()
        : null,
      pendingEmail: user.pendingEmail,
      platformRole: user.platformRole,
    },
    defaultWorkspaceId: user.defaultWorkspaceId,
  });
}
