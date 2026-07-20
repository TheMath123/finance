import type { User } from "../../../domain/entities/user";
import type { UseCaseDeps } from "../../deps";
import { REFRESH_TOKEN_TTL_MS } from "../../../infra/security/jose-token-service";

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerifiedAt: string | null;
    pendingEmail: string | null;
  };
  defaultWorkspaceId: string;
  accessToken: string;
  refreshToken: string;
}

/** Emite access + refresh token para uma sessão autenticada (usado por register/login/refresh). */
export async function issueSession(
  deps: Pick<UseCaseDeps, "repos" | "tokens">,
  user: User,
  workspaceId: string,
): Promise<AuthSession> {
  const refresh = deps.tokens.generateOpaque();
  await deps.repos.token.createRefresh({
    userId: user.id,
    tokenHash: refresh.hash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      pendingEmail: user.pendingEmail,
    },
    defaultWorkspaceId: workspaceId,
    accessToken: await deps.tokens.signAccess(user.id),
    refreshToken: refresh.raw,
  };
}
