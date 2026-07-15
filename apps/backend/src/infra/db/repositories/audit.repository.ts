import { auditLogs } from "@finance/db";
import type { AuditRecorder } from "../../../application/ports/audit-recorder";
import type { DbHandle } from "../handle";

export function createAuditRecorder(db: DbHandle): AuditRecorder {
  return {
    async record(entry) {
      await db.insert(auditLogs).values(entry);
    },
  };
}
