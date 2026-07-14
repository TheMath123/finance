/**
 * Enums do domínio, espelhados no schema do banco (packages/db).
 * Fonte única para backend e mobile.
 */
export const PLATFORM_ROLES = ["user", "superadmin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const WORKSPACE_TYPES = ["personal", "family", "business"] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];

export const WORKSPACE_PLANS = ["free", "premium"] as const;
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number];

export const WORKSPACE_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const INVITE_STATUSES = ["pending", "accepted", "expired", "revoked"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const ACCOUNT_TYPES = ["checking", "savings", "payment"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_METHODS = ["pix", "debit", "cash", "credit", "transfer"] as const;
export type TransactionMethod = (typeof TRANSACTION_METHODS)[number];

export const TRANSACTION_SOURCES = ["app", "chatbot"] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const INVOICE_STATUSES = ["open", "closed", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const RECURRENCE_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const AUDIT_ACTIONS = ["create", "update", "delete", "restore"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
