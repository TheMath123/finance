import { and, desc, eq, gte, lte } from "drizzle-orm";
import { auditLogs } from "@finance/db";
import type { AuditRecorder } from "../../../application/ports/audit-recorder";
import type { DbHandle } from "../handle";

export function createAuditRecorder(db: DbHandle): AuditRecorder {
  return {
    async record(entry) {
      await db.insert(auditLogs).values(entry);
    },
    async list(workspaceId, filters) {
      const conditions = [eq(auditLogs.workspaceId, workspaceId)];
      if (filters.entity) conditions.push(eq(auditLogs.entity, filters.entity));
      if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
      if (filters.from) conditions.push(gte(auditLogs.createdAt, new Date(`${filters.from}T00:00:00.000Z`)));
      if (filters.to) conditions.push(lte(auditLogs.createdAt, new Date(`${filters.to}T23:59:59.999Z`)));

      const rows = await db.query.auditLogs.findMany({
        where: and(...conditions),
        orderBy: [desc(auditLogs.createdAt)],
        limit: Math.min(filters.limit ?? 50, 200),
        offset: filters.offset ?? 0,
        with: { user: true },
      });

      return rows.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        createdAt: row.createdAt,
        userId: row.userId,
        userName: row.user?.name ?? null,
      }));
    },
  };
}
