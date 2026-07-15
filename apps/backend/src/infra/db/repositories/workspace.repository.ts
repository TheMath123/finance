import { and, eq } from "drizzle-orm";
import { workspaceMembers, workspaces } from "@finance/db";
import type { WorkspaceRepository } from "../../../application/ports/workspace-repository";
import type { DbHandle } from "../handle";

export function createWorkspaceRepository(db: DbHandle): WorkspaceRepository {
  return {
    async create(data) {
      const [row] = await db.insert(workspaces).values(data).returning();
      if (!row) throw new Error("falha ao criar workspace");
      return row;
    },
    async addMember(data) {
      await db.insert(workspaceMembers).values(data);
    },
    async getMemberRole(workspaceId, userId) {
      const member = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      });
      return member?.role ?? null;
    },
    async listByUser(userId) {
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        with: { workspace: true },
      });
      return memberships.map((m) => ({ workspace: m.workspace, role: m.role }));
    },
  };
}
