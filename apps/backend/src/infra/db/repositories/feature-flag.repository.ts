import { featureFlags } from '@finance/db';
import { asc, eq } from 'drizzle-orm';
import type { FeatureFlagRepository } from '../../../application/ports/feature-flag-repository';
import type { DbHandle } from '../handle';

export function createFeatureFlagRepository(
  db: DbHandle
): FeatureFlagRepository {
  return {
    list: () =>
      db.query.featureFlags.findMany({ orderBy: asc(featureFlags.key) }),
    findByKey: (key) =>
      db.query.featureFlags.findFirst({ where: eq(featureFlags.key, key) }),
    async upsert(key, data) {
      const [row] = await db
        .insert(featureFlags)
        .values({ key, ...data })
        .onConflictDoUpdate({
          target: featureFlags.key,
          set: data,
        })
        .returning();
      if (!row) throw new Error('falha ao salvar feature flag');
      return row;
    },
  };
}
