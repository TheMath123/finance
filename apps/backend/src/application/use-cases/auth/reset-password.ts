import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { AuthError } from "./errors";

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export async function resetPassword(
  deps: UseCaseDeps,
  input: ResetPasswordInput,
): Promise<Either<AuthError, null>> {
  const stored = await deps.repos.token.findValidAuthToken(
    "password_reset",
    deps.tokens.hashOpaque(input.token),
  );
  if (!stored) return left("invalid_token");

  const passwordHash = await deps.hasher.hash(input.password);
  await deps.uow.run(async (repos) => {
    // Nova senha também zera o lockout progressivo (regra do spec)
    await repos.user.updatePassword(stored.userId, passwordHash);
    await repos.token.markAuthTokenUsed(stored.id);
    // Revoga todas as sessões (OWASP)
    await repos.token.deleteAllRefreshByUser(stored.userId);
  });

  const user = await deps.repos.user.findById(stored.userId);
  if (user) {
    await deps.dispatch("email.password-changed", { to: user.email, name: user.name });
  }
  return right(null);
}
