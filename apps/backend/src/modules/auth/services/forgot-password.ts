import { and, eq, isNull } from "drizzle-orm";
import { authTokens, users } from "@finance/db";
import { right, type Either } from "@finance/shared";
import type { AppDeps } from "../../../lib/deps";
import { securityLog } from "../../../lib/log";
import { isRateLimited } from "../../../lib/rate-limit";
import { RESET_TOKEN_TTL_MS, generateOpaqueToken } from "../../../lib/tokens";
import type { ForgotPasswordInput } from "../schemas";

/** Sempre retorna sucesso — não revela se o e-mail existe (OWASP). */
export async function forgotPassword(
  deps: AppDeps,
  input: ForgotPasswordInput,
): Promise<Either<never, null>> {
  // Limite por e-mail ALVO (anti flood na vítima) — silencioso: resposta continua genérica
  if (isRateLimited(`forgot:${input.email}`, 3, 3_600_000)) {
    securityLog("forgot_password_throttled", {});
    return right(null);
  }

  const user = await deps.db.query.users.findFirst({ where: eq(users.email, input.email) });
  // Reset exige e-mail verificado (spec: Segurança > Cadastro)
  if (!user || !user.emailVerifiedAt) return right(null);

  // Gerar novo token invalida os anteriores não usados
  await deps.db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.userId, user.id),
        eq(authTokens.purpose, "password_reset"),
        isNull(authTokens.usedAt),
      ),
    );

  const reset = generateOpaqueToken();
  await deps.db.insert(authTokens).values({
    userId: user.id,
    purpose: "password_reset",
    tokenHash: reset.hash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  await deps.dispatch("email.password-reset", {
    to: user.email,
    name: user.name,
    resetUrl: `${deps.appUrl}/reset-password?token=${reset.raw}`,
  });
  return right(null);
}
