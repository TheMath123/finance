import type { WorkspaceRole, WorkspaceType } from "@finance/shared";
import type { Workspace } from "../../domain/entities/workspace";

export interface WorkspaceRepository {
  create(data: { name: string; type: WorkspaceType }): Promise<Workspace>;
  addMember(data: { workspaceId: string; userId: string; role: WorkspaceRole }): Promise<void>;
  getMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null>;
  listByUser(userId: string): Promise<{ workspace: Workspace; role: WorkspaceRole }[]>;
  /** Exclusão de conta (LGPD). Cascata via FK cuida de bancos, contas, cartões, categorias, transações, faturas, recorrências e audit log. */
  delete(workspaceId: string): Promise<void>;
}
