import { auditLogs, type Db } from "@finance/db";
import type { AuditAction } from "@finance/shared";

/**
 * Hook de auditoria do M1 (write-only, spec: AuditLog).
 * Chamado pela camada de service em toda mutação; leitura/tela é M2.
 * Aceita a transação do Drizzle para gravar atomicamente com a mutação.
 */
export interface AuditEntry {
  workspaceId: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
}

type DbOrTx = Pick<Db, "insert">;

export async function recordAudit(db: DbOrTx, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values(entry);
}
