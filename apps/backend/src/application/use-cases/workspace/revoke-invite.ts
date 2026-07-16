import { left, right, type Either } from "@finance/shared";
import { roleAtLeast } from "../../../domain/services/authorization";
import type { UseCaseDeps } from "../../deps";
import type { WorkspaceError } from "./errors";

/** Rota top-level (`/invites/:id/revoke`, sem :workspaceId na URL) — autorização checada aqui dentro. */
export async function revokeInvite(
  deps: UseCaseDeps,
  userId: string,
  inviteId: string,
): Promise<Either<WorkspaceError, null>> {
  const invite = await deps.repos.invite.findById(inviteId);
  if (!invite) return left("invite_not_found");

  const role = await deps.repos.workspace.getMemberRole(invite.workspaceId, userId);
  if (!role || !roleAtLeast(role, "admin")) return left("forbidden");

  if (invite.status !== "pending") return left("invite_not_pending");

  await deps.repos.invite.updateStatus(invite.id, "revoked");
  await deps.repos.audit.record({
    workspaceId: invite.workspaceId,
    userId,
    action: "update",
    entity: "workspace_invite",
    entityId: invite.id,
  });

  return right(null);
}
