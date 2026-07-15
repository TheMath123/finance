import type { AuditAction } from "@finance/shared";

export interface AuditEntry {
  workspaceId: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
}

/** Hook de auditoria write-only do M1 (spec: AuditLog). */
export interface AuditRecorder {
  record(entry: AuditEntry): Promise<void>;
}
