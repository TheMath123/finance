import { relations } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './helpers';
import { users } from './user';
import { workspaces } from './workspace';

export const savedFormulaDisplayFormatEnum = pgEnum(
  'saved_formula_display_format',
  ['currency', 'number']
);

/** Onde a fórmula fica fixada como widget — `none` é criada mas não exibida em nenhuma tela. */
export const savedFormulaPinnedToEnum = pgEnum('saved_formula_pinned_to', [
  'none',
  'home',
  'transactions',
]);

export const savedFormulas = pgTable(
  'saved_formulas',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    /** Só aritmética (+ - * / parênteses) sobre tokens do catálogo fixo — ver @finance/formula. */
    expression: text('expression').notNull(),
    displayFormat: savedFormulaDisplayFormatEnum('display_format')
      .notNull()
      .default('currency'),
    pinnedTo: savedFormulaPinnedToEnum('pinned_to').notNull().default('none'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('saved_formulas_workspace_idx').on(t.workspaceId)]
);

export const savedFormulasRelations = relations(savedFormulas, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [savedFormulas.workspaceId],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [savedFormulas.createdByUserId],
    references: [users.id],
  }),
}));

export type SavedFormula = typeof savedFormulas.$inferSelect;
export type NewSavedFormula = typeof savedFormulas.$inferInsert;
