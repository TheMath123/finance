import { and, eq } from "drizzle-orm";
import { notificationPreferences } from "@finance/db";
import type { NotificationPreferenceRepository } from "../../../application/ports/notification-preference-repository";
import type { DbHandle } from "../handle";

export function createNotificationPreferenceRepository(db: DbHandle): NotificationPreferenceRepository {
  return {
    listByUser: (userId) =>
      db.query.notificationPreferences.findMany({ where: eq(notificationPreferences.userId, userId) }),
    async isEnabled(userId, type) {
      const row = await db.query.notificationPreferences.findFirst({
        where: and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.type, type)),
      });
      return row?.enabled ?? true;
    },
    async upsert(userId, type, enabled) {
      const [row] = await db
        .insert(notificationPreferences)
        .values({ userId, type, enabled })
        .onConflictDoUpdate({
          target: [notificationPreferences.userId, notificationPreferences.type],
          set: { enabled },
        })
        .returning();
      if (!row) throw new Error("falha ao salvar preferência de notificação");
      return row;
    },
  };
}
