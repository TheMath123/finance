import { and, eq, gt, isNull } from "drizzle-orm";
import { authTokens, refreshTokens } from "@finance/db";
import type { TokenRepository } from "../../../application/ports/token-repository";
import type { DbHandle } from "../handle";

export function createTokenRepository(db: DbHandle): TokenRepository {
  return {
    async createRefresh(data) {
      await db.insert(refreshTokens).values(data);
    },
    findRefreshByHash: (tokenHash) =>
      db.query.refreshTokens.findFirst({ where: eq(refreshTokens.tokenHash, tokenHash) }),
    async deleteRefreshById(id) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, id));
    },
    async deleteRefreshByHash(tokenHash) {
      await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    },
    async deleteAllRefreshByUser(userId) {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    },
    async createAuthToken(data) {
      await db.insert(authTokens).values(data);
    },
    findValidAuthToken: (purpose, tokenHash) =>
      db.query.authTokens.findFirst({
        where: and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.purpose, purpose),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      }),
    findValidAuthTokenForUser: (userId, purpose, tokenHash) =>
      db.query.authTokens.findFirst({
        where: and(
          eq(authTokens.userId, userId),
          eq(authTokens.purpose, purpose),
          eq(authTokens.tokenHash, tokenHash),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      }),
    async markAuthTokenUsed(id) {
      await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, id));
    },
    async deleteUnusedAuthTokens(userId, purpose) {
      await db
        .delete(authTokens)
        .where(
          and(
            eq(authTokens.userId, userId),
            eq(authTokens.purpose, purpose),
            isNull(authTokens.usedAt),
          ),
        );
    },
  };
}
