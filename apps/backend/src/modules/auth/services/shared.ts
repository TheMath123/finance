import { refreshTokens, type User } from "@finance/db";
import type { AppDeps } from "../../../lib/deps";
import { REFRESH_TOKEN_TTL_MS, generateOpaqueToken, signAccessToken } from "../../../lib/tokens";

export const BCRYPT = { algorithm: "bcrypt", cost: 12 } as const;

export interface AuthSession {
  user: { id: string; name: string; email: string };
  defaultWorkspaceId: string;
  accessToken: string;
  refreshToken: string;
}

export async function issueSession(
  deps: AppDeps,
  user: User,
  workspaceId: string,
): Promise<AuthSession> {
  const refresh = generateOpaqueToken();
  await deps.db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refresh.hash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return {
    user: { id: user.id, name: user.name, email: user.email },
    defaultWorkspaceId: workspaceId,
    accessToken: await signAccessToken(deps.jwtSecret, user.id),
    refreshToken: refresh.raw,
  };
}
