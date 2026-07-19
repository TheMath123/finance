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
  const role = invite ? await deps.repos.workspace.getMemberRole(invite.workspaceId, userId) : null;
  // Auditoria de segurança (2026-07-19): mesmo 404 genérico pra "não existe" e "existe mas
  // não é do workspace do ator" — não revela a um usuário qualquer que um inviteId
  // corresponde a um convite de um workspace que ele não administra.
  if (!invite || !role || !roleAtLeast(role, "admin")) return left("invite_not_found");

  if (invite.status !== "pending") return left("invite_not_pending");

  // Condicional (WHERE status='pending') — undefined se accept/expire concorrente já decidiu primeiro.
  const revoked = await deps.repos.invite.updateStatus(invite.id, "pending", "revoked");
  if (!revoked) return left("invite_not_pending");

  await deps.repos.audit.record({
    workspaceId: invite.workspaceId,
    userId,
    action: "update",
    entity: "workspace_invite",
    entityId: invite.id,
  });

  return right(null);
}
