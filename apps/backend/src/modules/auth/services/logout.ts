import { eq } from "drizzle-orm";
import { refreshTokens } from "@finance/db";
import { right, type Either } from "@finance/shared";
import type { AppDeps } from "../../../lib/deps";
import { hashToken } from "../../../lib/tokens";
import type { RefreshInput } from "../schemas";

export async function logout(deps: AppDeps, input: RefreshInput): Promise<Either<never, null>> {
  await deps.db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(input.refreshToken)));
  return right(null);
}
