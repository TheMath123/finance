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
import { createdAt, id, updatedAt } from './helpers';
import { transactions } from './transaction';
import { users } from './user';

export const splitShareStatusEnum = pgEnum('split_share_status', [
  'pending',
  'paid',
  'confirmed',
]);

export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: id(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Soft-cancel — só permitido enquanto nenhuma parte foi paga/confirmada (decisão de produto, M3-03). */
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('expense_splits_transaction_idx').on(t.transactionId)]
);

export const expenseSplitsRelations = relations(
  expenseSplits,
  ({ one, many }) => ({
    transaction: one(transactions, {
      fields: [expenseSplits.transactionId],
      references: [transactions.id],
    }),
    createdByUser: one(users, {
      fields: [expenseSplits.createdBy],
      references: [users.id],
    }),
    shares: many(splitShares),
  })
);

export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;

export const splitShares = pgTable(
  'split_shares',
  {
    id: id(),
    splitId: uuid('split_id')
      .notNull()
      .references(() => expenseSplits.id, { onDelete: 'cascade' }),
    /** Participante com conta na plataforma — mutuamente exclusivo com participantName (regra na aplicação, não no banco). */
    participantUserId: uuid('participant_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    /** Participante externo, sem app — controle manual do criador. */
    participantName: text('participant_name'),
    /** Centavos. */
    amount: bigint('amount', { mode: 'number' }).notNull(),
    status: splitShareStatusEnum('status').notNull().default('pending'),
    /** Entrada (reembolso) pro criador, gerada na confirmação — nunca mexe na despesa original. */
    reimbursementTransactionId: uuid('reimbursement_transaction_id').references(
      () => transactions.id,
      {
        onDelete: 'restrict',
      }
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('split_shares_split_idx').on(t.splitId),
    index('split_shares_participant_user_idx').on(
      t.participantUserId,
      t.status
    ),
  ]
);

export const splitSharesRelations = relations(splitShares, ({ one }) => ({
  split: one(expenseSplits, {
    fields: [splitShares.splitId],
    references: [expenseSplits.id],
  }),
  participantUser: one(users, {
    fields: [splitShares.participantUserId],
    references: [users.id],
  }),
  reimbursementTransaction: one(transactions, {
    fields: [splitShares.reimbursementTransactionId],
    references: [transactions.id],
  }),
}));

export type SplitShare = typeof splitShares.$inferSelect;
export type NewSplitShare = typeof splitShares.$inferInsert;
