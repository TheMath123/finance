import type {
  SubscriptionStatus,
  WorkspaceRole,
  WorkspaceType,
} from '@finance/shared';
import type { Workspace } from '../../domain/entities/workspace';
import type { Plan, PlanPrice } from './plan-repository';

/**
 * `avatarKey`/`avatarUrl` são o par bruto do domínio `User` (M5-07) — nunca
 * devem sair daqui pro client como estão; `list-members.ts` resolve pra um
 * `avatarUrl` final antes de expor na tela de membros.
 */
export interface WorkspaceMemberView {
  userId: string;
  role: WorkspaceRole;
  name: string;
  email: string;
  avatarKey: string | null;
  avatarUrl: string | null;
}

export interface AdminWorkspaceRow {
  workspace: Workspace & { plan: Plan; planPrice: PlanPrice | null };
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
}

export interface WorkspacePlanPatch {
  planId: string;
  planPriceId: string | null;
  trialEndsAt: Date | null;
}

/** M5-05 — patch de sincronização de estado de assinatura, vindo do webhook do Stripe (distinto de `WorkspacePlanPatch`, que é atribuição manual do superadmin). */
export interface WorkspaceSubscriptionPatch {
  stripeCustomerId?: string;
  /** `null` limpa o campo — usado ao cancelar a assinatura na atribuição de um plano privado. */
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  planId?: string;
  planPriceId?: string | null;
  trialEndsAt?: Date | null;
  currentPeriodEndsAt?: Date;
  cancelAtPeriodEnd?: boolean;
}

export interface WorkspaceRepository {
  create(data: {
    name: string;
    type: WorkspaceType;
    planId: string;
    planPriceId?: string;
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
  updatePlan(
    workspaceId: string,
    patch: WorkspacePlanPatch
  ): Promise<Workspace>;
  /** M5-05 — id de customer/subscription do Stripe. */
  findByStripeCustomerId(customerId: string): Promise<Workspace | undefined>;
  findByStripeSubscriptionId(
    subscriptionId: string
  ): Promise<Workspace | undefined>;
  updateSubscriptionState(
    workspaceId: string,
    patch: WorkspaceSubscriptionPatch
  ): Promise<Workspace>;
}
