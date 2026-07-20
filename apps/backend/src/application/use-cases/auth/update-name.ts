import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { AuthError } from "./errors";

export interface UpdateNameInput {
  /** Sempre o ator autenticado (guard extrai do JWT) — nunca um alvo vindo do cliente. */
  userId: string;
  name: string;
}

/** Edição de perfil: nome muda sem confirmação extra (spec do perfil). */
export async function updateName(
  deps: Pick<UseCaseDeps, "repos">,
  input: UpdateNameInput,
): Promise<Either<AuthError, { name: string }>> {
  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left("invalid_token");

  await deps.repos.user.updateName(user.id, input.name);
  return right({ name: input.name });
}
