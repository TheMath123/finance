import { relations } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { banks } from './bank';
import { cardInvoices } from './card-invoice';
import { createdAt, id, updatedAt } from './helpers';
import { workspaces } from './workspace';

export const cards = pgTable(
  'cards',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    bankId: uuid('bank_id')
      .notNull()
      .references(() => banks.id),
    name: text('name').notNull(),
    /** Centavos. Limite disponível = limit − Σ(faturas não pagas) — derivado. */
    limit: bigint('limit', { mode: 'number' }).notNull(),
    closingDay: integer('closing_day').notNull(),
    dueDay: integer('due_day').notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('cards_workspace_idx').on(t.workspaceId)]
);

export const cardsRelations = relations(cards, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [cards.workspaceId],
    references: [workspaces.id],
  }),
  bank: one(banks, { fields: [cards.bankId], references: [banks.id] }),
  invoices: many(cardInvoices),
}));

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
