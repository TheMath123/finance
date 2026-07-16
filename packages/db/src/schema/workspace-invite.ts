import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helpers";
import { users } from "./user";
import { workspaces } from "./workspace";

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);
/** Convite nunca concede `owner` — posse só por transferência explícita (regra de sucessão). */
export const inviteRoleEnum = pgEnum("invite_role", ["admin", "member", "viewer"]);

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Nullable: se quem convidou excluir a conta (LGPD), o convite continua existindo anonimizado. */
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    emailOrPhone: text("email_or_phone").notNull(),
    role: inviteRoleEnum("role").notNull(),
    status: inviteStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("workspace_invites_workspace_idx").on(t.workspaceId)],
);

export const workspaceInvitesRelations = relations(workspaceInvites, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvites.workspaceId],
    references: [workspaces.id],
  }),
  inviter: one(users, { fields: [workspaceInvites.invitedBy], references: [users.id] }),
}));

export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvites.$inferInsert;
