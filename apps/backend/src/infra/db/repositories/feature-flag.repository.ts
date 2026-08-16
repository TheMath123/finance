import { featureFlags } from '@finance/db';
import { asc, desc, eq, sql } from 'drizzle-orm';
import type { FeatureFlagRepository } from '../../../application/ports/feature-flag-repository';
import { toPrefixTsQuery } from '../full-text-search';
import type { DbHandle } from '../handle';

export function createFeatureFlagRepository(
  db: DbHandle
): FeatureFlagRepository {
  return {
    list: (search) => {
      const tsQuery = search ? toPrefixTsQuery(search) : null;
      return db.query.featureFlags.findMany({
        where: tsQuery
          ? sql`${featureFlags.searchVector} @@ to_tsquery('portuguese', ${tsQuery})`
          : undefined,
        // Ativas primeiro, ordem alfabética dentro de cada grupo.
        orderBy: [desc(featureFlags.enabled), asc(featureFlags.key)],
      });
    },
    findByKey: (key) =>
      db.query.featureFlags.findFirst({ where: eq(featureFlags.key, key) }),
    async upsert(key, data) {
      // `title` nunca vem em `data` (não é editável via API, só o seed
      // decide) — se essa chamada de fato criar uma flag nova (não é o
      // caminho real do app, que só atualiza uma já existente, mas testes
      // usam `upsert` direto pra semear flags ad-hoc), cai no próprio `key`
      // como título de fallback, igual o backfill da migration fez.
      const [row] = await db
        .insert(featureFlags)
        .values({ key, title: key, ...data })
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
