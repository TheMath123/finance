import { oauthAccounts } from '@finance/db';
import { and, eq } from 'drizzle-orm';
import type { OauthAccountRepository } from '../../../application/ports/oauth-account-repository';
import type { DbHandle } from '../handle';

export function createOauthAccountRepository(
  db: DbHandle
): OauthAccountRepository {
  return {
    findByProvider: (provider, providerAccountId) =>
      db.query.oauthAccounts.findFirst({
        where: and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId)
        ),
      }),
    findByUserAndProvider: (userId, provider) =>
      db.query.oauthAccounts.findFirst({
        where: and(
          eq(oauthAccounts.userId, userId),
          eq(oauthAccounts.provider, provider)
        ),
      }),
    async create(data) {
      await db.insert(oauthAccounts).values(data);
    },
    async deleteByUserAndProvider(userId, provider) {
      await db
        .delete(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.userId, userId),
            eq(oauthAccounts.provider, provider)
          )
        );
    },
  };
}
