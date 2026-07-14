import { relations } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helpers";
import { workspaces } from "./workspace";
import { users } from "./user";
import { categories } from "./category";
import { bankAccounts } from "./bank-account";
import { cards } from "./card";
import { cardInvoices } from "./card-invoice";
import { recurringTransactions } from "./recurring-transaction";
import { transactionMethodEnum, transactionTypeEnum } from "./enums";

export const transactionSourceEnum = pgEnum("transaction_source", ["app", "chatbot"]);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Quem lançou (auditoria em workspaces compartilhados). Null = usuário excluído (anonimizado, LGPD). */
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    /** lowercase/sem acentos — chave do cache de categorização da IA e da busca. */
    descriptionNormalized: text("description_normalized").notNull(),
    /** Centavos. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    method: transactionMethodEnum("method").notNull(),
    /** Data de competência — date local (America/Sao_Paulo), sem hora. */
    date: date("date").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    /** Obrigatório quando method ≠ credit; origem na transferência. */
    accountId: uuid("account_id").references(() => bankAccounts.id),
    /** Apenas method = transfer: conta de destino. */
    toAccountId: uuid("to_account_id").references(() => bankAccounts.id),
    /** Obrigatório quando method = credit. */
    cardId: uuid("card_id").references(() => cards.id),
    /** Apenas method = credit. */
    invoiceId: uuid("invoice_id").references(() => cardInvoices.id),
    installmentNumber: integer("installment_number"),
    installmentTotal: integer("installment_total"),
    /** Agrupa as N parcelas de uma mesma compra (exclusão em grupo das não pagas). */
    installmentGroupId: uuid("installment_group_id"),
    recurringId: uuid("recurring_id").references(() => recurringTransactions.id, {
      onDelete: "set null",
    }),
    source: transactionSourceEnum("source").notNull().default("app"),
    /** Soft delete — cálculos e listagens filtram `deleted_at IS NULL`. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("transactions_workspace_date_idx").on(t.workspaceId, t.date),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_invoice_idx").on(t.invoiceId),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_desc_norm_idx").on(t.workspaceId, t.descriptionNormalized),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  workspace: one(workspaces, { fields: [transactions.workspaceId], references: [workspaces.id] }),
  creator: one(users, { fields: [transactions.createdBy], references: [users.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  account: one(bankAccounts, {
    fields: [transactions.accountId],
    references: [bankAccounts.id],
    relationName: "account",
  }),
  toAccount: one(bankAccounts, {
    fields: [transactions.toAccountId],
    references: [bankAccounts.id],
    relationName: "toAccount",
  }),
  card: one(cards, { fields: [transactions.cardId], references: [cards.id] }),
  invoice: one(cardInvoices, {
    fields: [transactions.invoiceId],
    references: [cardInvoices.id],
  }),
  recurring: one(recurringTransactions, {
    fields: [transactions.recurringId],
    references: [recurringTransactions.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
