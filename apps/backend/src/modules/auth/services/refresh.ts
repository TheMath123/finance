import { eq } from "drizzle-orm";
import { refreshTokens, users } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { AppDeps } from "../../../lib/deps";
import { hashToken } from "../../../lib/tokens";
import type { RefreshInput } from "../schemas";
import type { AuthError } from "../errors";
import { issueSession, type AuthSession } from "./shared";

export async function refresh(
  deps: AppDeps,
  input: RefreshInput,
): Promise<Either<AuthError, AuthSession>> {
  const tokenHash = hashToken(input.refreshToken);
  const stored = await deps.db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.tokenHash, tokenHash),
  });
  if (!stored) return left("invalid_token");

  // Rotação: o token usado é sempre invalidado, válido ou expirado
  await deps.db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
  if (stored.expiresAt.getTime() <= Date.now()) return left("invalid_token");

  const user = await deps.db.query.users.findFirst({ where: eq(users.id, stored.userId) });
  if (!user || !user.defaultWorkspaceId) return left("invalid_token");

  return right(await issueSession(deps, user, user.defaultWorkspaceId));
}
