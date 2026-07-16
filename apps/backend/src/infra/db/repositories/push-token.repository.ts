import { and, eq } from "drizzle-orm";
import { pushTokens } from "@finance/db";
import type { PushTokenRepository } from "../../../application/ports/push-token-repository";
import type { DbHandle } from "../handle";

export function createPushTokenRepository(db: DbHandle): PushTokenRepository {
  return {
    async register(userId, token) {
      await db
        .insert(pushTokens)
        .values({ userId, token })
        .onConflictDoUpdate({ target: pushTokens.token, set: { userId } });
    },
    async unregister(userId, token) {
      await db.delete(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));
    },
    async listByUser(userId) {
      const rows = await db.query.pushTokens.findMany({ where: eq(pushTokens.userId, userId) });
      return rows.map((r) => r.token);
    },
  };
}
