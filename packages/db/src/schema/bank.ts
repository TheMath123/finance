import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bankAccounts } from './bank-account';
import { cards } from './card';
import { createdAt, id, updatedAt } from './helpers';
import { workspaces } from './workspace';

export const banks = pgTable(
  'banks',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Validado contra o catálogo em @finance/shared (sem pgEnum — adicionar banco não exige migração). */
    bankCode: text('bank_code').notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('banks_workspace_idx').on(t.workspaceId)]
);

export const banksRelations = relations(banks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [banks.workspaceId],
    references: [workspaces.id],
  }),
  accounts: many(bankAccounts),
  cards: many(cards),
}));

export type Bank = typeof banks.$inferSelect;
export type NewBank = typeof banks.$inferInsert;
