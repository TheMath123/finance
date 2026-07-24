import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';
import { workspaces } from './workspace';

export const categories = pgTable(
  'categories',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    /** "Outros" (seed) é a categoria fallback do workspace: não-deletável; recebe transações de categorias excluídas. */
    isFallback: boolean('is_fallback').notNull().default(false),
    /** Categoria do seed (criada junto com o workspace) — não editável nem excluível pelo usuário. */
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('categories_workspace_idx').on(t.workspaceId)]
);

export const categoriesRelations = relations(categories, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [categories.workspaceId],
    references: [workspaces.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
