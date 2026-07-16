import type { InviteRole } from "@finance/shared";
import { left, right, type Either } from "@finance/shared";
import { FREE_PLAN_LIMITS } from "../../../domain/services/plan-limits";
import type { WorkspaceInvite } from "../../../domain/entities/workspace";
import type { Actor, UseCaseDeps } from "../../deps";
import type { WorkspaceError } from "./errors";

/** Spec não fixa TTL numérico pro convite de workspace (diferente do token/OTP) — 7 dias é o padrão escolhido. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInviteInput {
  emailOrPhone: string;
  role: InviteRole;
}

export async function createInvite(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateInviteInput,
): Promise<Either<WorkspaceError, WorkspaceInvite>> {
  const target = input.emailOrPhone.trim();
  const looksLikeEmail = target.includes("@");

  // Telefone só casa com usuário de verdade quando o vínculo do WhatsApp (M2-05)
  // popular `users.phone` — até lá, convite por telefone só fica pendente no banco.
  if (looksLikeEmail) {
    const user = await deps.repos.user.findByEmail(target.toLowerCase());
    if (user) {
      const role = await deps.repos.workspace.getMemberRole(actor.workspaceId, user.id);
      if (role) return left("already_member");
    }
  }

  // Enforcement de plano (M2-03): free = no máximo 5 membros por workspace.
  // Reforçado de novo no aceite (accept-invite.ts) — vários convites pendentes
  // podem ser aceitos em paralelo depois deste check.
  const workspace = await deps.repos.workspace.findById(actor.workspaceId);
  if (workspace?.plan === "free") {
    const members = await deps.repos.workspace.listMembers(actor.workspaceId);
    if (members.length >= FREE_PLAN_LIMITS.maxMembersPerWorkspace) {
      return left("plan_limit_reached");
    }
  }

  const existing = await deps.repos.invite.findPendingForTarget(actor.workspaceId, target);
  if (existing) await deps.repos.invite.updateStatus(existing.id, "revoked");

  const invite = await deps.repos.invite.create({
    workspaceId: actor.workspaceId,
    invitedBy: actor.userId,
    emailOrPhone: target,
    role: input.role,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  if (looksLikeEmail && workspace) {
    const inviter = await deps.repos.user.findById(actor.userId);
    if (inviter) {
      await deps.dispatch("email.workspace-invite", {
        to: target,
        inviterName: inviter.name,
        workspaceName: workspace.name,
      });
    }
  }

  return right(invite);
}
