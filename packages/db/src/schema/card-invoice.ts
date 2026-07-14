import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helpers";
import { workspaces } from "./workspace";
import { cards } from "./card";

export const invoiceStatusEnum = pgEnum("invoice_status", ["open", "closed", "paid"]);

/**
 * Fatura do cartão — agrupador mensal das transações de crédito.
 * `total` NÃO é armazenado: é derivado da soma das transações da fatura (regra do spec).
 * O status efetivo no M1 é calculado na leitura (open + data > closing_day ⇒ tratada como closed).
 */
export const cardInvoices = pgTable(
  "card_invoices",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    monthReference: integer("month_reference").notNull(),
    yearReference: integer("year_reference").notNull(),
    status: invoiceStatusEnum("status").notNull().default("open"),
    /**
     * Transação de despesa que quitou a fatura. Sem FK para evitar ciclo
     * transactions ↔ card_invoices; a integridade é garantida no service de pagamento.
     */
    paymentTransactionId: uuid("payment_transaction_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("card_invoices_card_period_idx").on(t.cardId, t.yearReference, t.monthReference),
  ],
);

export const cardInvoicesRelations = relations(cardInvoices, ({ one }) => ({
  workspace: one(workspaces, { fields: [cardInvoices.workspaceId], references: [workspaces.id] }),
  card: one(cards, { fields: [cardInvoices.cardId], references: [cards.id] }),
}));

export type CardInvoice = typeof cardInvoices.$inferSelect;
export type NewCardInvoice = typeof cardInvoices.$inferInsert;
