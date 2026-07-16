import { left, right, type Either } from "@finance/shared";
import { roleAtLeast } from "../../../domain/services/authorization";
import type { Actor, UseCaseDeps } from "../../deps";
import type { WorkspaceError } from "./errors";

/**
 * Mesmo endpoint serve pra "sair do workspace" (targetUserId === actor.userId,
 * sempre permitido, exceto sendo o único owner) e "remover membro" (só
 * admin/owner). Regra de sucessão: único owner não pode sair nem ser removido.
 */
export async function removeMember(
  deps: UseCaseDeps,
  actor: Actor,
  targetUserId: string,
): Promise<Either<WorkspaceError, null>> {
  const isSelf = actor.userId === targetUserId;
  if (!isSelf && !roleAtLeast(actor.role, "admin")) return left("forbidden");

  const role = await deps.repos.workspace.getMemberRole(actor.workspaceId, targetUserId);
  if (!role) return left("member_not_found");

  if (role === "owner") {
    const owners = await deps.repos.workspace.countOwners(actor.workspaceId);
    if (owners <= 1) return left("sole_owner_cannot_leave");
  }

  await deps.uow.run(async (repos) => {
    await repos.workspace.removeMember(actor.workspaceId, targetUserId);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "workspace_member",
      entityId: targetUserId,
    });
  });

  return right(null);
}
