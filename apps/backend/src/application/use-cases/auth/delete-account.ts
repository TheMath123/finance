import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { AuthError } from "./errors";

export interface DeleteAccountInput {
  userId: string;
  password: string;
}

/**
 * Exclusão de conta (LGPD). Reautentica via senha (o access token sozinho não é
 * suficiente para uma ação irreversível). Deleta o usuário e o workspace pessoal
 * dentro da mesma transação — o restante (bancos, contas, cartões, categorias,
 * transações, faturas, recorrências, audit log, refresh tokens, workspace_members)
 * já cascateia via FK `onDelete: "cascade"` no schema.
 *
 * Ordem importa: `users.default_workspace_id` referencia `workspaces.id` sem
 * cascade, então o usuário precisa ser deletado ANTES do workspace (senão a FK
 * bloqueia a exclusão do workspace enquanto o usuário ainda aponta pra ele).
 */
export async function deleteAccount(
  deps: UseCaseDeps,
  input: DeleteAccountInput,
): Promise<Either<AuthError, null>> {
  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left("invalid_credentials");

  const valid = await deps.hasher.verify(input.password, user.passwordHash);
  if (!valid) return left("invalid_credentials");

  await deps.uow.run(async (repos) => {
    await repos.user.delete(user.id);
    if (user.defaultWorkspaceId) {
      await repos.workspace.delete(user.defaultWorkspaceId);
    }
  });

  return right(null);
}
