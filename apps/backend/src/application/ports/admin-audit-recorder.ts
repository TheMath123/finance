export interface AdminAuditEntry {
  adminUserId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Auditoria de ações administrativas (superadmin), separada do `AuditRecorder`
 * de workspace. Write-only por enquanto — M4-07 é só a fundação; uma tela de
 * leitura (se vier a ser necessária) é decisão de um milestone futuro.
 */
export interface AdminAuditRecorder {
  record(entry: AdminAuditEntry): Promise<void>;
}
