import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
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
    /** Fixação não é exclusiva — a mesma fórmula pode virar widget nas duas telas ao mesmo tempo. */
    pinnedHome: boolean('pinned_home').notNull().default(false),
    pinnedTransactions: boolean('pinned_transactions').notNull().default(false),
    /** Ordem de exibição do widget fixado (drag-and-drop, M5-01c) — null quando não fixada naquela tela; reseta ao despin/repin. */
    homeOrder: integer('home_order'),
    transactionsOrder: integer('transactions_order'),
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
