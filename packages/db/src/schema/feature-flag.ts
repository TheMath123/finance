import { type SQL, sql } from 'drizzle-orm';
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, id, tsvector, updatedAt } from './helpers';

/**
 * Flags simples on/off (M4-09) — sem rollout percentual/segmentação de
 * propósito (não pedido, YAGNI nesse estágio). `key` é o identificador
 * estável consultado no código via `isFeatureEnabled(key)`.
 */
export const featureFlags = pgTable(
  'feature_flags',
  {
    id: id(),
    key: text('key').notNull().unique(),
    /**
     * Nome legível pra identificar a flag na UI (ex.: "Chatbot de IA no
     * WhatsApp") — `key` continua sendo o identificador técnico estável
     * (slug), `title` é só pra facilitar leitura no painel `/saas`. Definido
     * junto com a flag no seed da migration, igual `key` — não é editável via
     * API (mesma proteção estrutural de `isSystem`, ver `FeatureFlagInput`).
     */
    title: text('title').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    description: text('description'),
    /**
     * Flags predefinidas da plataforma (seed via migration, ver drizzle/ —
     * mesmo padrão de `default_categories`/`platform_settings`): nunca podem
     * ser excluídas via API/UI, só o toggle `enabled` é editável pelo
     * superadmin. `upsert` nunca escreve este campo (fora de
     * `FeatureFlagInput`, ver feature-flag-repository.ts) — só o seed decide
     * quem é `isSystem`.
     */
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /**
     * Busca full-text (título + descrição + key) — gerada pelo Postgres,
     * nunca escrita pela aplicação. Ver CLAUDE.md: buscas por palavra usam
     * full-text search, nunca ILIKE.
     */
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('portuguese', ${featureFlags.title} || ' ' || coalesce(${featureFlags.description}, '') || ' ' || ${featureFlags.key})`
    ),
  },
  (t) => [index('feature_flags_search_vector_idx').using('gin', t.searchVector)]
);

export type FeatureFlagRow = typeof featureFlags.$inferSelect;
export type NewFeatureFlagRow = typeof featureFlags.$inferInsert;
