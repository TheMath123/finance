import { and, eq, inArray, sql } from "drizzle-orm";
import { workspaceInvites } from "@finance/db";
import type { WorkspaceInviteRepository } from "../../../application/ports/workspace-invite-repository";
import type { DbHandle } from "../handle";

export function createWorkspaceInviteRepository(db: DbHandle): WorkspaceInviteRepository {
  return {
    async create(data) {
      const [row] = await db.insert(workspaceInvites).values(data).returning();
      if (!row) throw new Error("falha ao criar convite");
      return row;
    },
    findById: (id) => db.query.workspaceInvites.findFirst({ where: eq(workspaceInvites.id, id) }),
    findPendingByEmailOrPhone(candidates) {
      if (candidates.length === 0) return Promise.resolve([]);
      return db.query.workspaceInvites.findMany({
        where: and(
          eq(workspaceInvites.status, "pending"),
          inArray(
            sql`lower(${workspaceInvites.emailOrPhone})`,
            candidates.map((c) => c.toLowerCase()),
          ),
        ),
      });
    },
    findPendingForTarget: (workspaceId, emailOrPhone) =>
      db.query.workspaceInvites.findFirst({
        where: and(
          eq(workspaceInvites.workspaceId, workspaceId),
          eq(workspaceInvites.status, "pending"),
          sql`lower(${workspaceInvites.emailOrPhone}) = lower(${emailOrPhone})`,
        ),
      }),
    listPendingForWorkspace: (workspaceId) =>
      db.query.workspaceInvites.findMany({
        where: and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.status, "pending")),
      }),
    async updateStatus(id, status) {
      await db.update(workspaceInvites).set({ status }).where(eq(workspaceInvites.id, id));
    },
  };
}
