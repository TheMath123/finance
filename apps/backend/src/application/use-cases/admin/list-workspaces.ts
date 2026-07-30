import type { WorkspaceType } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { Plan, PlanPrice } from '../../ports/plan-repository';

export interface AdminWorkspaceView {
  id: string;
  name: string;
  type: WorkspaceType;
  plan: Plan;
  planPrice: PlanPrice | null;
  trialEndsAt: string | null;
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
}

export interface ListWorkspacesOutput {
  workspaces: AdminWorkspaceView[];
  total: number;
}

export interface ListWorkspacesInput {
  search?: string;
  limit: number;
  offset: number;
}

export async function listWorkspaces(
  deps: Pick<UseCaseDeps, 'repos'>,
  input: ListWorkspacesInput
): Promise<ListWorkspacesOutput> {
  const { workspaces, total } =
    await deps.repos.workspace.listAllForAdmin(input);
  return {
    workspaces: workspaces.map((row) => ({
      id: row.workspace.id,
      name: row.workspace.name,
      type: row.workspace.type,
      plan: row.workspace.plan,
      planPrice: row.workspace.planPrice,
      trialEndsAt: row.workspace.trialEndsAt
        ? row.workspace.trialEndsAt.toISOString()
        : null,
      memberCount: row.memberCount,
      ownerName: row.ownerName,
      ownerEmail: row.ownerEmail,
      createdAt: row.workspace.createdAt.toISOString(),
    })),
    total,
  };
}
