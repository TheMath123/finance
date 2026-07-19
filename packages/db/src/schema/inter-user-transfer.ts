import { relations } from "drizzle-orm";
import { bigint, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helpers";
import { users } from "./user";
import { transactions } from "./transaction";

export const interUserTransferStatusEnum = pgEnum("inter_user_transfer_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
]);

export const interUserTransfers = pgTable(
  "inter_user_transfers",
  {
    id: id(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Saída no workspace do remetente — nasce junto com a transferência, nunca desfeita mesmo se expirar/recusar. */
    fromTransactionId: uuid("from_transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "restrict" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Entrada no workspace/conta escolhida pelo destinatário — só existe após aceite. */
    toTransactionId: uuid("to_transaction_id").references(() => transactions.id, { onDelete: "restrict" }),
    /** Centavos. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    status: interUserTransferStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("inter_user_transfers_to_user_status_idx").on(t.toUserId, t.status),
    index("inter_user_transfers_from_user_idx").on(t.fromUserId),
    /** Varrido pelo sweep diário pra expirar pendentes vencidas. */
    index("inter_user_transfers_status_expires_idx").on(t.status, t.expiresAt),
  ],
);

export const interUserTransfersRelations = relations(interUserTransfers, ({ one }) => ({
  fromUser: one(users, { fields: [interUserTransfers.fromUserId], references: [users.id] }),
  toUser: one(users, { fields: [interUserTransfers.toUserId], references: [users.id] }),
  fromTransaction: one(transactions, {
    fields: [interUserTransfers.fromTransactionId],
    references: [transactions.id],
  }),
  toTransaction: one(transactions, {
    fields: [interUserTransfers.toTransactionId],
    references: [transactions.id],
  }),
}));

export type InterUserTransfer = typeof interUserTransfers.$inferSelect;
export type NewInterUserTransfer = typeof interUserTransfers.$inferInsert;
