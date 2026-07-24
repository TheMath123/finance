import { relations } from 'drizzle-orm';
import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { banks } from './bank';
import { createdAt, id, updatedAt } from './helpers';
import { workspaces } from './workspace';

export const accountTypeEnum = pgEnum('account_type', [
  'checking',
  'savings',
  'payment',
]);

export const bankAccounts = pgTable(
  'bank_accounts',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    bankId: uuid('bank_id')
      .notNull()
      .references(() => banks.id),
    name: text('name').notNull(),
    type: accountTypeEnum('type').notNull(),
    /** Centavos. Saldo atual é SEMPRE derivado: initialBalance + Σ transações (regra do spec). */
    initialBalance: bigint('initial_balance', { mode: 'number' })
      .notNull()
      .default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('bank_accounts_workspace_idx').on(t.workspaceId)]
);

export const bankAccountsRelations = relations(bankAccounts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [bankAccounts.workspaceId],
    references: [workspaces.id],
  }),
  bank: one(banks, { fields: [bankAccounts.bankId], references: [banks.id] }),
}));

export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
