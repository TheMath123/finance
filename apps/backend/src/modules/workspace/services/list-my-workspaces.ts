import { eq } from "drizzle-orm";
import { workspaceMembers } from "@finance/db";
import type { DbDeps } from "../../../lib/deps";

export interface WorkspaceSummary {
  id: string;
  name: string;
  type: string;
  plan: string;
  role: string;
}

/** Workspaces do usuário autenticado (seletor do app). */
export async function listMyWorkspaces(deps: DbDeps, userId: string): Promise<WorkspaceSummary[]> {
  const memberships = await deps.db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    with: { workspace: true },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    type: m.workspace.type,
    plan: m.workspace.plan,
    role: m.role,
  }));
}
