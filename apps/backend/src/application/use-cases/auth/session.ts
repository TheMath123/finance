import type { User } from '../../../domain/entities/user';
import { REFRESH_TOKEN_TTL_MS } from '../../../infra/security/jose-token-service';
import type { UseCaseDeps } from '../../deps';
import { resolveAvatarUrl } from './resolve-avatar-url';

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerifiedAt: string | null;
    pendingEmail: string | null;
    platformRole: import('@finance/shared').PlatformRole;
    avatarUrl: string | null;
    /** Tem uma conta Google vinculada (login social ou vínculo manual pelo perfil, M5-07)? */
    googleLinked: boolean;
  };
  defaultWorkspaceId: string;
  accessToken: string;
  refreshToken: string;
}

/** Emite access + refresh token para uma sessão autenticada (usado por register/login/refresh). */
export async function issueSession(
  deps: Pick<UseCaseDeps, 'repos' | 'tokens' | 'storage'>,
  user: User,
  workspaceId: string
): Promise<AuthSession> {
  const refresh = deps.tokens.generateOpaque();
  await deps.repos.token.createRefresh({
    userId: user.id,
    tokenHash: refresh.hash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  const [avatarUrl, googleAccount] = await Promise.all([
    resolveAvatarUrl(deps, user),
    deps.repos.oauthAccount.findByUserAndProvider(user.id, 'google'),
  ]);
  return {
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
      avatarUrl,
      googleLinked: !!googleAccount,
    },
    defaultWorkspaceId: workspaceId,
    accessToken: await deps.tokens.signAccess(user.id),
    refreshToken: refresh.raw,
  };
}
