import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import type { WorkspaceError } from "./errors";

/**
 * Convidado aceita (autenticado — spec: "aceitar no app"). Confere que o
 * e-mail/telefone do convite é mesmo do usuário logado (nunca aceitar convite
 * alheio só por adivinhar o id). Idempotente: se já é membro, só marca aceito.
 */
export async function acceptInvite(
  deps: UseCaseDeps,
  userId: string,
  inviteId: string,
): Promise<Either<WorkspaceError, null>> {
  const invite = await deps.repos.invite.findById(inviteId);
  if (!invite) return left("invite_not_found");

  if (invite.status !== "pending") return left("invite_not_pending");
  if (invite.expiresAt.getTime() < Date.now()) {
    await deps.repos.invite.updateStatus(invite.id, "expired");
    return left("invite_not_pending");
  }

  const user = await deps.repos.user.findById(userId);
  if (!user) return left("invite_forbidden");

  const target = invite.emailOrPhone.toLowerCase();
  const matches =
    user.email.toLowerCase() === target || (!!user.phone && user.phone.toLowerCase() === target);
  if (!matches) return left("invite_forbidden");

  await deps.uow.run(async (repos) => {
    const existingRole = await repos.workspace.getMemberRole(invite.workspaceId, userId);
    if (!existingRole) {
      await repos.workspace.addMember({ workspaceId: invite.workspaceId, userId, role: invite.role });
    }
    await repos.invite.updateStatus(invite.id, "accepted");
    await repos.audit.record({
      workspaceId: invite.workspaceId,
      userId,
      action: "create",
      entity: "workspace_member",
      entityId: userId,
    });
  });

  return right(null);
}
