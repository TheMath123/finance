import { type Either, left, right } from '@finance/shared';
import { resolveEffectivePlan } from '../../../domain/services/resolve-effective-plan';
import type { UseCaseDeps } from '../../deps';
import { isUniqueConstraintError } from '../../errors';
import type { WorkspaceError } from './errors';

/**
 * Convidado aceita (autenticado — spec: "aceitar no app"). Confere que o
 * e-mail/telefone do convite é mesmo do usuário logado (nunca aceitar convite
 * alheio só por adivinhar o id) e que o e-mail está verificado quando o match
 * é por e-mail (spec: "convites de workspace exigem e-mail verificado" — match
 * por telefone já prova posse via OTP do WhatsApp, M2-05). Idempotente: se já
 * é membro, só marca aceito.
 */
export async function acceptInvite(
  deps: UseCaseDeps,
  userId: string,
  inviteId: string
): Promise<Either<WorkspaceError, null>> {
  const invite = await deps.repos.invite.findById(inviteId);
  if (!invite) return left('invite_not_found');

  if (invite.status !== 'pending') return left('invite_not_pending');
  if (invite.expiresAt.getTime() < Date.now()) {
    await deps.repos.invite.updateStatus(invite.id, 'pending', 'expired');
    return left('invite_not_pending');
  }

  const user = await deps.repos.user.findById(userId);
  // Auditoria de segurança (2026-07-19): mesmo 404 genérico pra qualquer motivo de não
  // poder aceitar (usuário sumiu, e-mail/telefone não bate, e-mail não verificado) — não
  // revela detalhe nenhum sobre um convite que não é do ator.
  if (!user) return left('invite_not_found');

  const target = invite.emailOrPhone.toLowerCase();
  const matchesEmail = user.email.toLowerCase() === target;
  const matchesPhone = !!user.phone && user.phone.toLowerCase() === target;
  // Continua 404 genérico pra quem o convite nem é (auditoria 2026-07-19) —
  // mas quando o convite já bateu com o próprio e-mail do usuário logado,
  // "e-mail não verificado" não revela nada sobre terceiros (o usuário já
  // sabe que o convite é dele e que o e-mail dele não está verificado), então
  // vale um erro honesto/acionável em vez do mesmo "não encontrado" confuso
  // (bug real em produção: convite aparecia em "Meus convites" — listMyInvites
  // não filtra por verificação — mas o aceite falhava com mensagem genérica).
  if (!matchesEmail && !matchesPhone) return left('invite_not_found');
  if (matchesEmail && !user.emailVerifiedAt)
    return left('invite_email_not_verified');

  // Reforça o limite de membros (M2-03) — já checado na criação do convite, mas
  // vários convites pendentes podem ter sido aceitos em paralelo desde então.
  const existingRole = await deps.repos.workspace.getMemberRole(
    invite.workspaceId,
    userId
  );
  if (!existingRole) {
    const workspace = await deps.repos.workspace.findById(invite.workspaceId);
    if (workspace) {
      const plan = await resolveEffectivePlan(deps, workspace);
      const members = await deps.repos.workspace.listMembers(
        invite.workspaceId
      );
      if (plan && members.length >= plan.limits.maxMembersPerWorkspace) {
        return left('plan_limit_reached');
      }
    }
  }

  // Auditoria de segurança (2026-07-19): marca aceito de forma condicional (WHERE
  // status='pending') ANTES de adicionar o membro — fecha a corrida com revokeInvite
  // (nunca vira membro depois do convite já ter sido revogado) e evita até chegar no
  // addMember se outra chamada (accept duplicado, expire do sweep) já decidiu primeiro.
  const accepted = await deps.uow.run(async (repos) => {
    const updated = await repos.invite.updateStatus(
      invite.id,
      'pending',
      'accepted'
    );
    if (!updated) return null;

    const currentRole = await repos.workspace.getMemberRole(
      invite.workspaceId,
      userId
    );
    if (!currentRole) {
      try {
        await repos.workspace.addMember({
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        });
      } catch (error) {
        // Corrida rara: virou membro por outro caminho entre a checagem acima e aqui —
        // idempotente igual ao resto do fluxo, não precisa propagar o erro.
        if (!isUniqueConstraintError(error)) throw error;
      }
    }
    await repos.audit.record({
      workspaceId: invite.workspaceId,
      userId,
      action: 'create',
      entity: 'workspace_member',
      entityId: userId,
    });
    return updated;
  });

  if (!accepted) return left('invite_not_pending');
  return right(null);
}
