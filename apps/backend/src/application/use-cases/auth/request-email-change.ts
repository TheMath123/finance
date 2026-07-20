import { left, right, type Either } from "@finance/shared";
import { isLocked, nextLockoutState } from "../../../domain/services/lockout-rules";
import type { UseCaseDeps } from "../../deps";
import { RESET_TOKEN_TTL_MS } from "../../../infra/security/jose-token-service";
import type { AuthError } from "./errors";

export interface RequestEmailChangeInput {
  /** Sempre o ator autenticado (guard extrai do JWT) — nunca um alvo vindo do cliente. */
  userId: string;
  newEmail: string;
  currentPassword: string;
}

/**
 * Passo 1 da troca de e-mail do perfil: gera um código de 6 dígitos (mesmo
 * mecanismo do reset de senha) e manda pro e-mail NOVO — prova que o usuário
 * é dono dele antes de qualquer coisa valer. O e-mail atual só muda de fato em
 * `confirmEmailChange`.
 *
 * Reautentica com a senha ATUAL antes de aceitar o pedido (auditoria
 * 2026-07-20, mesmo padrão de `delete-account.ts`/`change-password.ts`) — sem
 * isso, um access token vazado (15 min de validade) bastaria sozinho pra
 * iniciar uma troca de e-mail, mesmo sem saber a senha.
 */
export async function requestEmailChange(
  deps: UseCaseDeps,
  input: RequestEmailChangeInput,
): Promise<Either<AuthError, null>> {
  // Autenticado (userId já resolvido) — o limite é por usuário, não por e-mail alvo.
  if (await deps.rateLimiter.isLimited(`email-change-request:${input.userId}`, 5, 3_600_000)) {
    return left("rate_limited");
  }

  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left("invalid_credentials");

  const now = new Date();
  if (isLocked(user.lockedUntil, now)) return left("invalid_credentials");

  const valid = await deps.hasher.verify(input.currentPassword, user.passwordHash);
  if (!valid) {
    const { attempts, lockedUntil } = nextLockoutState(user.failedLoginAttempts, now);
    await deps.repos.user.recordLoginFailure(user.id, attempts, lockedUntil);
    return left("invalid_credentials");
  }
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await deps.repos.user.resetLock(user.id);
  }

  // E-mail já em uso por OUTRO usuário é rejeitado ANTES de mandar qualquer código.
  const existing = await deps.repos.user.findByEmail(input.newEmail);
  if (existing && existing.id !== user.id) return left("email_already_in_use");

  // Gerar novo código invalida os anteriores não usados (mesmo padrão do reset de senha).
  await deps.repos.token.deleteUnusedAuthTokens(user.id, "email_change");
  await deps.repos.user.setPendingEmail(user.id, input.newEmail);

  const code = deps.tokens.generateCode();
  await deps.repos.token.createAuthToken({
    userId: user.id,
    purpose: "email_change",
    tokenHash: code.hash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  await deps.dispatch("email.confirm-email-change", {
    to: input.newEmail,
    name: user.name,
    code: code.raw,
  });

  return right(null);
}
