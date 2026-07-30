import { users, workspaceMembers, workspaces } from '@finance/db';
import { and, count, eq, ilike, inArray, sql } from 'drizzle-orm';
import type { WorkspaceRepository } from '../../../application/ports/workspace-repository';
import type { DbHandle } from '../handle';

export function createWorkspaceRepository(db: DbHandle): WorkspaceRepository {
  return {
    async create(data) {
      const [row] = await db.insert(workspaces).values(data).returning();
      if (!row) throw new Error('falha ao criar workspace');
      return row;
    },
    findById: (workspaceId) =>
      db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) }),
    async update(workspaceId, patch) {
      const [row] = await db
        .update(workspaces)
        .set(patch)
        .where(eq(workspaces.id, workspaceId))
        .returning();
      if (!row) throw new Error('falha ao atualizar workspace');
      return row;
    },
    async addMember(data) {
      await db.insert(workspaceMembers).values(data);
    },
    async getMemberRole(workspaceId, userId) {
      const member = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
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
    async listMembers(workspaceId) {
      const rows = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId, workspaceId),
        with: { user: true },
      });
      return rows.map((m) => ({
        userId: m.userId,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
      }));
    },
    async countOwners(workspaceId) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.role, 'owner')
          )
        );
      return row?.count ?? 0;
    },
    async updateMemberRole(workspaceId, userId, role) {
      await db
        .update(workspaceMembers)
        .set({ role })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        );
    },
    async removeMember(workspaceId, userId) {
      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        );
    },
    async delete(workspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    },
    async updatePlan(workspaceId, planId) {
      const [row] = await db
        .update(workspaces)
        .set({ planId })
        .where(eq(workspaces.id, workspaceId))
        .returning();
      if (!row) throw new Error('falha ao atualizar plano do workspace');
      return row;
    },
    async listAllForAdmin({ search, limit, offset }) {
      const where = search ? ilike(workspaces.name, `%${search}%`) : undefined;
      const [rows, [totalRow]] = await Promise.all([
        db.query.workspaces.findMany({
          where,
          limit,
          offset,
          orderBy: (w, { desc }) => [desc(w.createdAt)],
          with: { plan: true },
        }),
        db.select({ value: count() }).from(workspaces).where(where),
      ]);

      const workspaceIds = rows.map((w) => w.id);
      const memberRows = workspaceIds.length
        ? await db.query.workspaceMembers.findMany({
            where: inArray(workspaceMembers.workspaceId, workspaceIds),
          })
        : [];

      const memberCountByWorkspace = new Map<string, number>();
      const ownerUserIdByWorkspace = new Map<string, string>();
      for (const m of memberRows) {
        memberCountByWorkspace.set(
          m.workspaceId,
          (memberCountByWorkspace.get(m.workspaceId) ?? 0) + 1
        );
        if (m.role === 'owner' && !ownerUserIdByWorkspace.has(m.workspaceId)) {
          ownerUserIdByWorkspace.set(m.workspaceId, m.userId);
        }
      }

      const ownerIds = [...new Set(ownerUserIdByWorkspace.values())];
      const owners = ownerIds.length
        ? await db.query.users.findMany({ where: inArray(users.id, ownerIds) })
        : [];
      const ownerById = new Map(owners.map((u) => [u.id, u]));

      return {
        workspaces: rows.map((w) => {
          const ownerId = ownerUserIdByWorkspace.get(w.id);
          const owner = ownerId ? ownerById.get(ownerId) : undefined;
          return {
            workspace: w,
            memberCount: memberCountByWorkspace.get(w.id) ?? 0,
            ownerName: owner?.name ?? null,
            ownerEmail: owner?.email ?? null,
          };
        }),
        total: totalRow?.value ?? 0,
      };
    },
  };
}
