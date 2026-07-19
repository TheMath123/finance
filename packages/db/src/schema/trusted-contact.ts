import { relations } from "drizzle-orm";
import { pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "./helpers";
import { users } from "./user";
import { bankAccounts } from "./bank-account";

export const trustedContacts = pgTable(
  "trusted_contacts",
  {
    id: id(),
    /** Quem confia — dono da preferência de auto-aceite. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Em quem confia — remetente cujas transferências pulam o aceite manual. */
    trustedUserId: uuid("trusted_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Conta onde a entrada automática cai — define também o workspace de destino. */
    defaultAccountId: uuid("default_account_id")
      .notNull()
      .references(() => bankAccounts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("trusted_contacts_user_trusted_idx").on(t.userId, t.trustedUserId)],
);

export const trustedContactsRelations = relations(trustedContacts, ({ one }) => ({
  user: one(users, { fields: [trustedContacts.userId], references: [users.id] }),
  trustedUser: one(users, { fields: [trustedContacts.trustedUserId], references: [users.id] }),
  defaultAccount: one(bankAccounts, {
    fields: [trustedContacts.defaultAccountId],
    references: [bankAccounts.id],
  }),
}));

export type TrustedContact = typeof trustedContacts.$inferSelect;
export type NewTrustedContact = typeof trustedContacts.$inferInsert;
