import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';

/**
 * Template das categorias criadas junto com cada workspace novo (register.ts,
 * create-workspace.ts) — editável pelo superadmin (M4-08), substitui a antiga
 * constante estática `DEFAULT_CATEGORIES`. Mudar aqui não afeta workspaces já
 * existentes, só os criados a partir de agora.
 */
export const defaultCategories = pgTable('default_categories', {
  id: id(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  /** "Outros": vira a categoria fallback (não-deletável) em todo workspace novo. */
  isFallback: boolean('is_fallback').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type DefaultCategoryRow = typeof defaultCategories.$inferSelect;
export type NewDefaultCategoryRow = typeof defaultCategories.$inferInsert;
