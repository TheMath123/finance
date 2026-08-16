import { type SQL, sql } from 'drizzle-orm';
import { boolean, index, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, id, tsvector, updatedAt } from './helpers';

/**
 * Template das categorias criadas junto com cada workspace novo (register.ts,
 * create-workspace.ts) — editável pelo superadmin (M4-08), substitui a antiga
 * constante estática `DEFAULT_CATEGORIES`. Mudar aqui não afeta workspaces já
 * existentes, só os criados a partir de agora.
 */
export const defaultCategories = pgTable(
  'default_categories',
  {
    id: id(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    /** "Outros": vira a categoria fallback (não-deletável) em todo workspace novo. */
    isFallback: boolean('is_fallback').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /**
     * Busca full-text por nome (painel `/saas/default-categories`) — gerada
     * pelo Postgres. Ver CLAUDE.md: buscas por palavra usam full-text
     * search, nunca ILIKE.
     */
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL => sql`to_tsvector('portuguese', ${defaultCategories.name})`
    ),
  },
  (t) => [
    index('default_categories_search_vector_idx').using('gin', t.searchVector),
  ]
);

export type DefaultCategoryRow = typeof defaultCategories.$inferSelect;
export type NewDefaultCategoryRow = typeof defaultCategories.$inferInsert;
