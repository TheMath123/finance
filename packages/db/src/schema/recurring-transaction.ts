import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helpers";
import { workspaces } from "./workspace";
import { categories } from "./category";
import { bankAccounts } from "./bank-account";
import { cards } from "./card";
import { transactionMethodEnum, transactionTypeEnum } from "./enums";

export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "weekly",
  "monthly",
  "yearly",
]);

/**
 * Template de transação recorrente — insumo da previsão mensal.
 * M1: não gera transação automaticamente; aparece como prevista e o app oferece
 * confirmar com um toque. Auto-lançamento via BullMQ é M2.
 */
export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    /** Centavos. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    method: transactionMethodEnum("method").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    accountId: uuid("account_id").references(() => bankAccounts.id),
    cardId: uuid("card_id").references(() => cards.id),
    frequency: recurrenceFrequencyEnum("frequency").notNull(),
    /** Dia do mês (monthly/yearly) ou da semana em JS 0-6, domingo=0 (weekly). */
    dayOfReference: integer("day_of_reference").notNull(),
    /** Apenas yearly: mês (1-12) em que ocorre. */
    monthOfReference: integer("month_of_reference"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("recurring_transactions_workspace_idx").on(t.workspaceId)],
);

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [recurringTransactions.workspaceId],
    references: [workspaces.id],
  }),
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
  account: one(bankAccounts, {
    fields: [recurringTransactions.accountId],
    references: [bankAccounts.id],
  }),
  card: one(cards, { fields: [recurringTransactions.cardId], references: [cards.id] }),
}));

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;
