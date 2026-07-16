import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { AuthError } from "./errors";

export interface ResetPasswordInput {
  email: string;
  code: string;
  password: string;
}

export async function resetPassword(
  deps: UseCaseDeps,
  input: ResetPasswordInput,
): Promise<Either<AuthError, null>> {
  // Mesmo limite do verify-reset-code — é a mesma superfície de força bruta do código
  if (deps.rateLimiter.isLimited(`reset-code:${input.email}`, 5, 15 * 60_000)) {
    return left("invalid_code");
  }

  const user = await deps.repos.user.findByEmail(input.email);
  if (!user) return left("invalid_code");

  const stored = await deps.repos.token.findValidAuthTokenForUser(
    user.id,
    "password_reset",
    deps.tokens.hashOpaque(input.code),
  );
  if (!stored) return left("invalid_code");

  const passwordHash = await deps.hasher.hash(input.password);
  await deps.uow.run(async (repos) => {
    // Nova senha também zera o lockout progressivo (regra do spec)
    await repos.user.updatePassword(stored.userId, passwordHash);
    await repos.token.markAuthTokenUsed(stored.id);
    // Revoga todas as sessões (OWASP)
    await repos.token.deleteAllRefreshByUser(stored.userId);
  });

  await deps.dispatch("email.password-changed", { to: user.email, name: user.name });
  return right(null);
}
