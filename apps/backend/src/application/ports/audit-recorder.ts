import type { AuditAction } from "@finance/shared";

export interface AuditEntry {
  workspaceId: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
}

export interface AuditLogView {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  createdAt: Date;
  userId: string | null;
  /** Null quando o usuário foi excluído (LGPD) — app exibe "Usuário removido". */
  userName: string | null;
}

export interface ListActivityFilters {
  entity?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Auditoria: write-only no M1 (hook genérico na camada de service). M2 traz a
 * leitura — endpoint + tela de "atividade do workspace" (spec).
 */
export interface AuditRecorder {
  record(entry: AuditEntry): Promise<void>;
  list(workspaceId: string, filters: ListActivityFilters): Promise<AuditLogView[]>;
}
