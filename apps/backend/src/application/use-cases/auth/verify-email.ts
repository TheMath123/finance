import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { AuthError } from "./errors";

export interface VerifyEmailInput {
  token: string;
}

export async function verifyEmail(
  deps: UseCaseDeps,
  input: VerifyEmailInput,
): Promise<Either<AuthError, null>> {
  const stored = await deps.repos.token.findValidAuthToken(
    "email_verification",
    deps.tokens.hashOpaque(input.token),
  );
  if (!stored) return left("invalid_token");

  await deps.uow.run(async (repos) => {
    await repos.user.markEmailVerified(stored.userId);
    await repos.token.markAuthTokenUsed(stored.id);
  });
  return right(null);
}
