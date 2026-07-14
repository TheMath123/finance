import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./helpers";
import { workspaceMembers } from "./workspace-member";
import { workspaceInvites } from "./workspace-invite";

export const workspaceTypeEnum = pgEnum("workspace_type", ["personal", "family", "business"]);
export const workspacePlanEnum = pgEnum("workspace_plan", ["free", "premium"]);

export const workspaces = pgTable("workspaces", {
  id: id(),
  name: text("name").notNull(),
  type: workspaceTypeEnum("type").notNull(),
  plan: workspacePlanEnum("plan").notNull().default("free"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
}));

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
