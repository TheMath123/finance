import type { WorkspaceRole } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import { resolveAvatarUrl } from '../auth/resolve-avatar-url';

export interface WorkspaceMemberSummary {
  userId: string;
  role: WorkspaceRole;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/** Tela de membros (M5-07): resolve o avatar de cada um antes de expor. */
export async function listMembers(
  deps: Pick<UseCaseDeps, 'repos' | 'storage'>,
  actor: Actor
): Promise<WorkspaceMemberSummary[]> {
  const rows = await deps.repos.workspace.listMembers(actor.workspaceId);
  return Promise.all(
    rows.map(async (row) => ({
      userId: row.userId,
      role: row.role,
      name: row.name,
      email: row.email,
      avatarUrl: await resolveAvatarUrl(deps, row),
    }))
  );
}
