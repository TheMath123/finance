import type { WorkspaceRole } from "@finance/shared";
import { left, right, type Either } from "@finance/shared";
import type { Actor, UseCaseDeps } from "../../deps";
import type { WorkspaceError } from "./errors";

export interface UpdateMemberRoleInput {
  userId: string;
  role: WorkspaceRole;
}

/**
 * Regra de sucessão (spec): só um owner pode promover outro membro a owner;
 * rebaixar um owner exige que sobre pelo menos mais um (nunca zero owners).
 */
export async function updateMemberRole(
  deps: UseCaseDeps,
  actor: Actor,
  input: UpdateMemberRoleInput,
): Promise<Either<WorkspaceError, null>> {
  const currentRole = await deps.repos.workspace.getMemberRole(actor.workspaceId, input.userId);
  if (!currentRole) return left("member_not_found");

  if (input.role === "owner" && actor.role !== "owner") {
    return left("owner_required_to_transfer");
  }

  if (currentRole === "owner" && input.role !== "owner") {
    if (actor.role !== "owner") return left("owner_required_to_transfer");
    const owners = await deps.repos.workspace.countOwners(actor.workspaceId);
    if (owners <= 1) return left("sole_owner_cannot_be_demoted");
  }

  await deps.uow.run(async (repos) => {
    await repos.workspace.updateMemberRole(actor.workspaceId, input.userId, input.role);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "workspace_member",
      entityId: input.userId,
    });
  });

  return right(null);
}
