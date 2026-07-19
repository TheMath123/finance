import type { InviteRole, InviteStatus } from "@finance/shared";
import type { WorkspaceInvite } from "../../domain/entities/workspace";

export interface CreateInviteData {
  workspaceId: string;
  invitedBy: string;
  emailOrPhone: string;
  role: InviteRole;
  expiresAt: Date;
}

export interface WorkspaceInviteRepository {
  create(data: CreateInviteData): Promise<WorkspaceInvite>;
  findById(id: string): Promise<WorkspaceInvite | undefined>;
  /** Convites pendentes endereçados a este e-mail/telefone — "convites recebidos" do usuário. */
  findPendingByEmailOrPhone(candidates: string[]): Promise<WorkspaceInvite[]>;
  /** Convite pendente já existente pro mesmo alvo no mesmo workspace (evita duplicar). */
  findPendingForTarget(workspaceId: string, emailOrPhone: string): Promise<WorkspaceInvite | undefined>;
  listPendingForWorkspace(workspaceId: string): Promise<WorkspaceInvite[]>;
  /** Condicional (`WHERE status=fromStatus`) — `undefined` se o convite já mudou de estado por outra chamada (corrida entre accept/revoke/expire). */
  updateStatus(id: string, fromStatus: InviteStatus, toStatus: InviteStatus): Promise<WorkspaceInvite | undefined>;
}
