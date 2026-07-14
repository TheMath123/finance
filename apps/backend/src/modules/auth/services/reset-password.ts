import { and, eq, gt, isNull } from "drizzle-orm";
import { authTokens, refreshTokens, users } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { AppDeps } from "../../../lib/deps";
import { hashToken } from "../../../lib/tokens";
import type { ResetPasswordInput } from "../schemas";
import type { AuthError } from "../errors";
import { BCRYPT } from "./shared";

export async function resetPassword(
  deps: AppDeps,
  input: ResetPasswordInput,
): Promise<Either<AuthError, null>> {
  const stored = await deps.db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, hashToken(input.token)),
      eq(authTokens.purpose, "password_reset"),
      isNull(authTokens.usedAt),
      gt(authTokens.expiresAt, new Date()),
    ),
  });
  if (!stored) return left("invalid_token");

  const passwordHash = await Bun.password.hash(input.password, BCRYPT);
  await deps.db.transaction(async (tx) => {
    // Nova senha também zera o lockout progressivo
    await tx
      .update(users)
      .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, stored.userId));
    await tx.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, stored.id));
    // Revoga todas as sessões (OWASP)
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, stored.userId));
  });

  const user = await deps.db.query.users.findFirst({ where: eq(users.id, stored.userId) });
  if (user) {
    await deps.dispatch("email.password-changed", { to: user.email, name: user.name });
  }
  return right(null);
}
