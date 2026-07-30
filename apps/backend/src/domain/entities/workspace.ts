import type {
  InviteRole,
  InviteStatus,
  WorkspaceRole,
  WorkspaceType,
} from '@finance/shared';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  /** M5-02: FK pra `plans` — ver `application/ports/plan-repository.ts`. */
  planId: string;
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

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  /** Nullable: fica sem dono se quem convidou excluir a conta (LGPD). */
  invitedBy: string | null;
  emailOrPhone: string;
  role: InviteRole;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
