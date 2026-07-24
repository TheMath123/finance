import type { WorkspaceInvite } from '../../../domain/entities/workspace';
import type { Actor, UseCaseDeps } from '../../deps';

/** Convites pendentes já enviados pelo workspace (visão do owner/admin que convidou). */
export function listWorkspaceInvites(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: Actor
): Promise<WorkspaceInvite[]> {
  return deps.repos.invite.listPendingForWorkspace(actor.workspaceId);
}
