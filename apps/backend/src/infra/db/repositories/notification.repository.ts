import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { notifications } from "@finance/db";
import type { NotificationRepository } from "../../../application/ports/notification-repository";
import type { DbHandle } from "../handle";

export function createNotificationRepository(db: DbHandle): NotificationRepository {
  return {
    async create(data) {
      const [row] = await db.insert(notifications).values(data).returning();
      if (!row) throw new Error("falha ao criar notificação");
      return row;
    },
    findById: (id) => db.query.notifications.findFirst({ where: eq(notifications.id, id) }),
    listByUser: (userId, archived) =>
      db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, userId),
          archived ? isNotNull(notifications.archivedAt) : isNull(notifications.archivedAt),
        ),
        orderBy: [desc(notifications.createdAt)],
        limit: 100,
      }),
    async markRead(id) {
      await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
    },
    async archive(id) {
      await db.update(notifications).set({ archivedAt: new Date() }).where(eq(notifications.id, id));
    },
    async unarchive(id) {
      await db.update(notifications).set({ archivedAt: null }).where(eq(notifications.id, id));
    },
    async existsForEntity(userId, type, entityKey) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.type, type),
            sql`${notifications.data}->>'entityKey' = ${entityKey}`,
          ),
        );
      return (row?.count ?? 0) > 0;
    },
  };
}
