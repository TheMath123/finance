import type { WorkspaceRole, WorkspaceType } from '@finance/shared';
import type { Workspace } from '../../domain/entities/workspace';
import type { Plan } from './plan-repository';

export interface WorkspaceMemberView {
  userId: string;
  role: WorkspaceRole;
  name: string;
  email: string;
}

export interface AdminWorkspaceRow {
  workspace: Workspace & { plan: Plan };
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
}

export interface WorkspaceRepository {
  create(data: {
    name: string;
    type: WorkspaceType;
    planId: string;
  }): Promise<Workspace>;
  findById(workspaceId: string): Promise<Workspace | undefined>;
  update(workspaceId: string, patch: { name: string }): Promise<Workspace>;
  addMember(data: {
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
  }): Promise<void>;
  getMemberRole(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceRole | null>;
  listByUser(
    userId: string
  ): Promise<{ workspace: Workspace; role: WorkspaceRole }[]>;
  /** Membros do workspace com nome/e-mail do usuário (tela de membros). */
  listMembers(workspaceId: string): Promise<WorkspaceMemberView[]>;
  /** Quantidade de membros com papel `owner` — base da regra de sucessão. */
  countOwners(workspaceId: string): Promise<number>;
  updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  /** Exclusão de conta (LGPD). Cascata via FK cuida de bancos, contas, cartões, categorias, transações, faturas, recorrências e audit log. */
  delete(workspaceId: string): Promise<void>;
  /** Listagem cross-usuário pro superadmin (M5-02) — dono, plano e nº de membros. */
  listAllForAdmin(input: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ workspaces: AdminWorkspaceRow[]; total: number }>;
  updatePlan(workspaceId: string, planId: string): Promise<Workspace>;
}
