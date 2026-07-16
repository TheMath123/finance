import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { AuthError } from "./errors";

export interface DeleteAccountInput {
  userId: string;
  password: string;
}

/**
 * Exclusão de conta (LGPD). Reautentica via senha (o access token sozinho não é
 * suficiente para uma ação irreversível).
 *
 * Regra (spec > Workspaces e compartilhamento > LGPD e exclusão): workspaces em
 * que o usuário é o ÚNICO owner são excluídos por completo (inclui sempre o
 * pessoal, e agora — M2 — também qualquer family em que ele acabou sendo o
 * único dono); em workspaces compartilhados que continuam existindo (têm outro
 * owner), só a membership dele some — `created_by`/`audit_logs.user_id`/
 * `workspace_invites.invited_by` são anonimizados via `onDelete: "set null"`
 * no schema, não precisa de código aqui.
 *
 * Ordem importa: `users.default_workspace_id` referencia `workspaces.id` sem
 * cascade, então o usuário precisa ser deletado ANTES de qualquer workspace
 * (senão a FK bloqueia a exclusão do pessoal enquanto o usuário ainda aponta
 * pra ele). Deletar o usuário primeiro também já remove a membership dele em
 * TODOS os workspaces (cascade), então `countOwners` depois do delete já
 * reflete só os owners que sobraram.
 */
export async function deleteAccount(
  deps: UseCaseDeps,
  input: DeleteAccountInput,
): Promise<Either<AuthError, null>> {
  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left("invalid_credentials");

  const valid = await deps.hasher.verify(input.password, user.passwordHash);
  if (!valid) return left("invalid_credentials");

  const memberships = await deps.repos.workspace.listByUser(user.id);
  const ownedWorkspaceIds = memberships.filter((m) => m.role === "owner").map((m) => m.workspace.id);

  await deps.uow.run(async (repos) => {
    await repos.user.delete(user.id);

    for (const workspaceId of ownedWorkspaceIds) {
      const remainingOwners = await repos.workspace.countOwners(workspaceId);
      if (remainingOwners === 0) {
        await repos.workspace.delete(workspaceId);
      }
    }
  });

  return right(null);
}
