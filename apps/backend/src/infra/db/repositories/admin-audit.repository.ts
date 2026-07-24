import { adminAuditLogs } from '@finance/db';
import type { AdminAuditRecorder } from '../../../application/ports/admin-audit-recorder';
import type { DbHandle } from '../handle';

export function createAdminAuditRecorder(db: DbHandle): AdminAuditRecorder {
  return {
    async record(entry) {
      await db.insert(adminAuditLogs).values(entry);
    },
  };
}
