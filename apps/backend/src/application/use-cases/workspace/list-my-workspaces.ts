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
  const plans = await deps.repos.plan.list();
  const planKeyById = new Map(plans.map((p) => [p.id, p.key]));
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    type: m.workspace.type,
    plan: planKeyById.get(m.workspace.planId) ?? 'free',
    role: m.role,
  }));
}
