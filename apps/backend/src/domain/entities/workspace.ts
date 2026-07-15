import type { WorkspacePlan, WorkspaceRole, WorkspaceType } from "@finance/shared";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  plan: WorkspacePlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}
