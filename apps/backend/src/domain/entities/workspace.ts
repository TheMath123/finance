import type {
  InviteRole,
  InviteStatus,
  SubscriptionStatus,
  WorkspaceRole,
  WorkspaceType,
} from '@finance/shared';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  /** M5-02: FK pra `plans` — ver `application/ports/plan-repository.ts`. */
  planId: string;
  /** M5-03: qual opção de cobrança (recorrência) do plano atual — nullable, exibição usa o preço default do plano se vazio. */
  planPriceId: string | null;
  /** M5-03: nulo = sem trial ativo; no passado = trial expirado (`resolveEffectivePlan` cai pro free). */
  trialEndsAt: Date | null;
  /** M5-05 — campos de assinatura real via Stripe (nulos = nunca assinou via gateway). */
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEndsAt: Date | null;
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
