import { left, right, type Either } from "@finance/shared";
import { isLocked, nextLockoutState } from "../../../domain/services/lockout-rules";
import type { UseCaseDeps } from "../../deps";
import { RESET_TOKEN_TTL_MS } from "../../../infra/security/jose-token-service";
import type { AuthError } from "./errors";

export interface RequestAccountDeletionInput {
  /** Sempre o ator autenticado (guard extrai do JWT) — nunca um alvo vindo do cliente. */
  userId: string;
  password: string;
}

/**
 * Passo 1 da exclusão de conta (LGPD): reautentica com a senha atual (mesmo
 * padrão de `request-email-change.ts`/`change-password.ts` — auditoria
 * 2026-07-21, ação irreversível não pode depender só do access token) e manda
 * um código de 6 dígitos para o e-mail JÁ cadastrado do usuário. A exclusão de
 * fato só acontece em `confirmAccountDeletion`.
 */
export async function requestAccountDeletion(
  deps: UseCaseDeps,
  input: RequestAccountDeletionInput,
): Promise<Either<AuthError, null>> {
  if (await deps.rateLimiter.isLimited(`account-deletion-request:${input.userId}`, 5, 3_600_000)) {
    return left("rate_limited");
  }

  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left("invalid_credentials");

  const now = new Date();
  if (isLocked(user.lockedUntil, now)) return left("invalid_credentials");

  const valid = await deps.hasher.verify(input.password, user.passwordHash);
  if (!valid) {
    const { attempts, lockedUntil } = nextLockoutState(user.failedLoginAttempts, now);
    await deps.repos.user.recordLoginFailure(user.id, attempts, lockedUntil);
    return left("invalid_credentials");
  }
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await deps.repos.user.resetLock(user.id);
  }

  // Gerar novo código invalida os anteriores não usados (mesmo padrão do reset de senha).
  await deps.repos.token.deleteUnusedAuthTokens(user.id, "account_deletion");

  const code = deps.tokens.generateCode();
  await deps.repos.token.createAuthToken({
    userId: user.id,
    purpose: "account_deletion",
    tokenHash: code.hash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  await deps.dispatch("email.confirm-account-deletion", {
    to: user.email,
    name: user.name,
    code: code.raw,
  });

  return right(null);
}
