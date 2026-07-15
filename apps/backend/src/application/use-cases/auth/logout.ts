import { right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { RefreshInput } from "./refresh";

export async function logout(deps: UseCaseDeps, input: RefreshInput): Promise<Either<never, null>> {
  await deps.repos.token.deleteRefreshByHash(deps.tokens.hashOpaque(input.refreshToken));
  return right(null);
}
