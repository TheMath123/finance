import type {
  AuditAction,
  InviteRole,
  WorkspaceRole,
  WorkspaceType,
} from '@finance/shared';

import { apiRequest, apiRequestText } from '@/lib/api-client';

/** Resposta crua de create/update (sem `role` — não é vínculo de membership). */
export interface WorkspaceInfo {
  id: string;
  name: string;
  type: WorkspaceType;
  /** M5-02: FK pra tabela `plans` — sem tier fixo em enum mais. */
  planId: string;
}

/** Vem de `listMyWorkspaces` (seletor) — `plan` aqui é a `key` do plano (ex. "free"/"premium"), não o id. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  type: WorkspaceType;
  plan: string;
  role: WorkspaceRole;
}

export interface WorkspaceMemberView {
  userId: string;
  role: WorkspaceRole;
  name: string;
  email: string;
}

export interface WorkspaceInviteView {
  id: string;
  workspaceId: string;
  emailOrPhone: string;
  role: InviteRole;
  status: string;
  expiresAt: string;
}

export interface MyInviteView {
  id: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
  role: InviteRole;
  expiresAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
}

export interface UpdateWorkspaceInput {
  name: string;
}

export interface CreateInviteInput {
  emailOrPhone: string;
  role: InviteRole;
}

export interface AuditLogView {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  createdAt: string;
  userId: string | null;
  /** Null quando o usuário foi excluído (LGPD). */
  userName: string | null;
}

export const workspaceApi = {
  listMine: () => apiRequest<WorkspaceSummary[]>('/workspaces'),

  create: (input: CreateWorkspaceInput) =>
    apiRequest<WorkspaceInfo>('/workspaces', { method: 'POST', body: input }),

  update: (workspaceId: string, input: UpdateWorkspaceInput) =>
    apiRequest<WorkspaceInfo>(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: input,
    }),

  listMembers: (workspaceId: string) =>
    apiRequest<WorkspaceMemberView[]>(`/workspaces/${workspaceId}/members`),

  updateMemberRole: (
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ) =>
    apiRequest<void>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      body: { role },
    }),

  removeMember: (workspaceId: string, userId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    }),

  createInvite: (workspaceId: string, input: CreateInviteInput) =>
    apiRequest<WorkspaceInviteView>(`/workspaces/${workspaceId}/invites`, {
      method: 'POST',
      body: input,
    }),

  listWorkspaceInvites: (workspaceId: string) =>
    apiRequest<WorkspaceInviteView[]>(`/workspaces/${workspaceId}/invites`),

  listMyInvites: () => apiRequest<MyInviteView[]>('/invites'),

  acceptInvite: (inviteId: string) =>
    apiRequest<void>(`/invites/${inviteId}/accept`, { method: 'POST' }),

  revokeInvite: (inviteId: string) =>
    apiRequest<void>(`/invites/${inviteId}/revoke`, { method: 'POST' }),

  listActivity: (workspaceId: string) =>
    apiRequest<AuditLogView[]>(`/workspaces/${workspaceId}/activity`),

  /** CSV de transações do workspace (M2-11, portabilidade LGPD) — exige papel admin/owner. */
  exportTransactionsCsv: (workspaceId: string) =>
    apiRequestText(`/workspaces/${workspaceId}/export.csv`),
};
