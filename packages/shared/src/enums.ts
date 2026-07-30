/**
 * Enums do domínio, espelhados no schema do banco (packages/db).
 * Fonte única para backend e mobile.
 */
export const PLATFORM_ROLES = ['user', 'superadmin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const WORKSPACE_TYPES = ['personal', 'family', 'business'] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export const BILLING_INTERVALS = ['day', 'week', 'month', 'year'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** Métodos de pagamento aceitos por opção de preço (M5-03) — só metadado hoje, sem gateway real integrado. */
export const PAYMENT_METHODS = ['credit_card', 'debit_card', 'pix'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Limites de plano (M5-02) — antes hardcoded em `FREE_PLAN_LIMITS`, agora
 * dado real da tabela `plans`. Mesmos 3 campos de sempre; `jsonb` no schema
 * pra permitir novos limites/tiers sem migration.
 */
export interface PlanLimits {
  /** Quantos workspaces compartilhados (family/business) um usuário pode possuir (ser owner). */
  maxOwnedSharedWorkspaces: number;
  /** Quantos membros um workspace desse plano pode ter no total. */
  maxMembersPerWorkspace: number;
  /** Quantas fórmulas customizadas (M5-01) um workspace desse plano pode salvar. */
  maxSavedFormulasPerWorkspace: number;
}

export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const INVITE_STATUSES = [
  'pending',
  'accepted',
  'expired',
  'revoked',
] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

/** Convite nunca concede `owner` — posse só por transferência explícita (regra de sucessão). */
export const INVITE_ROLES = ['admin', 'member', 'viewer'] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export const ACCOUNT_TYPES = ['checking', 'savings', 'payment'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_METHODS = [
  'pix',
  'debit',
  'cash',
  'credit',
  'transfer',
] as const;
export type TransactionMethod = (typeof TRANSACTION_METHODS)[number];

export const TRANSACTION_SOURCES = ['app', 'chatbot'] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const INVOICE_STATUSES = ['open', 'closed', 'paid'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const RECURRENCE_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'restore'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Extensível — todo tipo novo precisa de um rótulo em `NOTIFICATION_TYPE_LABELS` (mobile). */
export const NOTIFICATION_TYPES = [
  'workspace_invite',
  'invoice_closed',
  'invoice_due',
  'recurring_pending',
  'whatsapp_linked',
  'transfer_pending',
  'transfer_accepted',
  'split_payment_pending',
  'split_payment_paid',
  'split_reimbursement_confirmed',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const INTER_USER_TRANSFER_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'expired',
] as const;
export type InterUserTransferStatus =
  (typeof INTER_USER_TRANSFER_STATUSES)[number];

export const SPLIT_SHARE_STATUSES = ['pending', 'paid', 'confirmed'] as const;
export type SplitShareStatus = (typeof SPLIT_SHARE_STATUSES)[number];

export const SAVED_FORMULA_DISPLAY_FORMATS = ['currency', 'number'] as const;
export type SavedFormulaDisplayFormat =
  (typeof SAVED_FORMULA_DISPLAY_FORMATS)[number];
