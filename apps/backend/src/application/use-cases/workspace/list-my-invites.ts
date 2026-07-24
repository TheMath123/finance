import type { InviteRole } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';

export interface MyInviteView {
  id: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  role: InviteRole;
  expiresAt: string;
}

/** Convites pendentes endereçados ao usuário logado (por e-mail ou telefone vinculado). */
export async function listMyInvites(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string
): Promise<MyInviteView[]> {
  const user = await deps.repos.user.findById(userId);
  if (!user) return [];

  const candidates = [user.email, ...(user.phone ? [user.phone] : [])];
  const invites = await deps.repos.invite.findPendingByEmailOrPhone(candidates);

  return Promise.all(
    invites.map(async (invite) => {
      const [workspace, inviter] = await Promise.all([
        deps.repos.workspace.findById(invite.workspaceId),
        invite.invitedBy ? deps.repos.user.findById(invite.invitedBy) : null,
      ]);
      return {
        id: invite.id,
        workspaceId: invite.workspaceId,
        workspaceName: workspace?.name ?? 'Workspace',
        inviterName: inviter?.name ?? 'Alguém',
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
      };
    })
  );
}
