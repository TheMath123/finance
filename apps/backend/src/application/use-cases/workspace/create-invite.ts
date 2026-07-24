import type { InviteRole } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { WorkspaceInvite } from '../../../domain/entities/workspace';
import { FREE_PLAN_LIMITS } from '../../../domain/services/plan-limits';
import type { Actor, UseCaseDeps } from '../../deps';
import { createNotification } from '../notification';
import type { WorkspaceError } from './errors';

/** Spec não fixa TTL numérico pro convite de workspace (diferente do token/OTP) — 7 dias é o padrão escolhido. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInviteInput {
  emailOrPhone: string;
  role: InviteRole;
}

export async function createInvite(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateInviteInput
): Promise<Either<WorkspaceError, WorkspaceInvite>> {
  const target = input.emailOrPhone.trim();
  const looksLikeEmail = target.includes('@');

  // Telefone só casa com usuário de verdade quando o vínculo do WhatsApp (M2-05)
  // popular `users.phone` — até lá, convite por telefone só fica pendente no banco.
  let invitedUser: Awaited<ReturnType<typeof deps.repos.user.findByEmail>>;
  if (looksLikeEmail) {
    invitedUser = await deps.repos.user.findByEmail(target.toLowerCase());
    if (invitedUser) {
      const role = await deps.repos.workspace.getMemberRole(
        actor.workspaceId,
        invitedUser.id
      );
      if (role) return left('already_member');
    }
  }

  // Enforcement de plano (M2-03): free = no máximo 5 membros por workspace.
  // Reforçado de novo no aceite (accept-invite.ts) — vários convites pendentes
  // podem ser aceitos em paralelo depois deste check.
  const workspace = await deps.repos.workspace.findById(actor.workspaceId);
  if (workspace?.plan === 'free') {
    const members = await deps.repos.workspace.listMembers(actor.workspaceId);
    if (members.length >= FREE_PLAN_LIMITS.maxMembersPerWorkspace) {
      return left('plan_limit_reached');
    }
  }

  const existing = await deps.repos.invite.findPendingForTarget(
    actor.workspaceId,
    target
  );
  if (existing)
    await deps.repos.invite.updateStatus(existing.id, 'pending', 'revoked');

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
      await deps.dispatch('email.workspace-invite', {
        to: target,
        inviterName: inviter.name,
        workspaceName: workspace.name,
      });
      // Notificação in-app/push só dá pra criar se o convidado já tem conta (precisa de userId).
      if (invitedUser) {
        await createNotification(deps, {
          userId: invitedUser.id,
          workspaceId: actor.workspaceId,
          type: 'workspace_invite',
          title: 'Novo convite de workspace',
          body: `${inviter.name} te convidou pra ${workspace.name}.`,
          data: { inviteId: invite.id },
        });
      }
    }
  }

  return right(invite);
}
