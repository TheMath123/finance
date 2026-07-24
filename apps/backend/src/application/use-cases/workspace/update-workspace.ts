import type { Workspace } from '../../../domain/entities/workspace';
import type { Actor, UseCaseDeps } from '../../deps';

export interface UpdateWorkspaceInput {
  name: string;
}

/** Renomear workspace — admin/owner (checado no guard HTTP), qualquer tipo (inclusive `personal`). */
export async function updateWorkspace(
  deps: UseCaseDeps,
  actor: Actor,
  input: UpdateWorkspaceInput
): Promise<Workspace> {
  const workspace = await deps.uow.run(async (repos) => {
    const updated = await repos.workspace.update(actor.workspaceId, {
      name: input.name,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'update',
      entity: 'workspace',
      entityId: actor.workspaceId,
    });
    return updated;
  });
  return workspace;
}
