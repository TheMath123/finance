import { bankAccounts, workspaceMembers } from '@finance/db';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { AccountRepository } from '../../../application/ports/account-repository';
import type { DbHandle } from '../handle';

export function createAccountRepository(db: DbHandle): AccountRepository {
  return {
    async create(workspaceId, data) {
      const [row] = await db
        .insert(bankAccounts)
        .values({ ...data, workspaceId })
        .returning();
      if (!row) throw new Error('falha ao criar conta');
      return row;
    },
    findInWorkspace: (workspaceId, accountId) =>
      db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.workspaceId, workspaceId)
        ),
      }),
    findById: (accountId) =>
      db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, accountId),
      }),
    findActiveInWorkspace: (workspaceId, accountId) =>
      db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.workspaceId, workspaceId),
          isNull(bankAccounts.archivedAt)
        ),
      }),
    listByWorkspace: (workspaceId) =>
      db.query.bankAccounts.findMany({
        where: eq(bankAccounts.workspaceId, workspaceId),
      }),
    async listActiveForUser(userId) {
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
      });
      const workspaceIds = memberships.map((m) => m.workspaceId);
      if (workspaceIds.length === 0) return [];

      const rows = await db.query.bankAccounts.findMany({
        where: and(
          inArray(bankAccounts.workspaceId, workspaceIds),
          isNull(bankAccounts.archivedAt)
        ),
        with: { workspace: true },
      });
      return rows.map((row) => ({
        account: row,
        workspaceId: row.workspaceId,
        workspaceName: row.workspace.name,
      }));
    },
    async update(accountId, patch) {
      const [row] = await db
        .update(bankAccounts)
        .set(patch)
        .where(eq(bankAccounts.id, accountId))
        .returning();
      if (!row) throw new Error('falha ao atualizar conta');
      return row;
    },
    async setArchived(accountId, archived) {
      const [row] = await db
        .update(bankAccounts)
        .set({ archivedAt: archived ? new Date() : null })
        .where(eq(bankAccounts.id, accountId))
        .returning();
      if (!row) throw new Error('falha ao arquivar conta');
      return row;
    },
    async delete(accountId) {
      await db.delete(bankAccounts).where(eq(bankAccounts.id, accountId));
    },
    async existsByBank(bankId) {
      const row = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.bankId, bankId),
      });
      return row !== undefined;
    },
  };
}
