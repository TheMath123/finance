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
    async create(data) {
      await db.insert(oauthAccounts).values(data);
    },
  };
}
