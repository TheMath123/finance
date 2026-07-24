import type { UseCaseDeps } from '../../deps';

export interface WorkspaceSummary {
  id: string;
  name: string;
  type: string;
  plan: string;
  role: string;
}

/** Workspaces do usuário autenticado (seletor do app). */
export async function listMyWorkspaces(
  deps: UseCaseDeps,
  userId: string
): Promise<WorkspaceSummary[]> {
  const memberships = await deps.repos.workspace.listByUser(userId);
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    type: m.workspace.type,
    plan: m.workspace.plan,
    role: m.role,
  }));
}
