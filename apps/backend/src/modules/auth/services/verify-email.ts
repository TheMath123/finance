import { and, eq, gt, isNull } from "drizzle-orm";
import { authTokens, users } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { AppDeps } from "../../../lib/deps";
import { hashToken } from "../../../lib/tokens";
import type { VerifyEmailInput } from "../schemas";
import type { AuthError } from "../errors";

export async function verifyEmail(
  deps: AppDeps,
  input: VerifyEmailInput,
): Promise<Either<AuthError, null>> {
  const stored = await deps.db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, hashToken(input.token)),
      eq(authTokens.purpose, "email_verification"),
      isNull(authTokens.usedAt),
      gt(authTokens.expiresAt, new Date()),
    ),
  });
  if (!stored) return left("invalid_token");

  await deps.db.transaction(async (tx) => {
    await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, stored.userId));
    await tx.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, stored.id));
  });
  return right(null);
}
