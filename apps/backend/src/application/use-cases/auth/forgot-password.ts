import { right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import { RESET_TOKEN_TTL_MS } from "../../../infra/security/jose-token-service";

export interface ForgotPasswordInput {
  email: string;
}

/** Sempre retorna sucesso — não revela se o e-mail existe (OWASP). */
export async function forgotPassword(
  deps: UseCaseDeps,
  input: ForgotPasswordInput,
): Promise<Either<never, null>> {
  // Limite por e-mail ALVO (anti flood na vítima) — silencioso: resposta continua genérica
  if (await deps.rateLimiter.isLimited(`forgot:${input.email}`, 3, 3_600_000)) {
    deps.logger.log("forgot_password_throttled");
    return right(null);
  }

  const user = await deps.repos.user.findByEmail(input.email);
  // Reset exige e-mail verificado (spec: Segurança > Cadastro)
  if (!user || !user.emailVerifiedAt) return right(null);

  // Gerar novo token invalida os anteriores não usados
  await deps.repos.token.deleteUnusedAuthTokens(user.id, "password_reset");

  const reset = deps.tokens.generateCode();
  await deps.repos.token.createAuthToken({
    userId: user.id,
    purpose: "password_reset",
    tokenHash: reset.hash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  await deps.dispatch("email.password-reset", {
    to: user.email,
    name: user.name,
    code: reset.raw,
  });
  return right(null);
}
