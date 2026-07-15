import { and, eq } from "drizzle-orm";
import { banks } from "@finance/db";
import type { BankRepository } from "../../../application/ports/bank-repository";
import type { DbHandle } from "../handle";

export function createBankRepository(db: DbHandle): BankRepository {
  return {
    async create(workspaceId, data) {
      const [row] = await db
        .insert(banks)
        .values({ ...data, workspaceId })
        .returning();
      if (!row) throw new Error("falha ao criar banco");
      return row;
    },
    findInWorkspace: (workspaceId, bankId) =>
      db.query.banks.findFirst({
        where: and(eq(banks.id, bankId), eq(banks.workspaceId, workspaceId)),
      }),
    listByWorkspace: (workspaceId) =>
      db.query.banks.findMany({ where: eq(banks.workspaceId, workspaceId) }),
    async update(bankId, patch) {
      const [row] = await db.update(banks).set(patch).where(eq(banks.id, bankId)).returning();
      if (!row) throw new Error("falha ao atualizar banco");
      return row;
    },
    async setArchived(bankId, archived) {
      const [row] = await db
        .update(banks)
        .set({ archivedAt: archived ? new Date() : null })
        .where(eq(banks.id, bankId))
        .returning();
      if (!row) throw new Error("falha ao arquivar banco");
      return row;
    },
    async delete(bankId) {
      await db.delete(banks).where(eq(banks.id, bankId));
    },
  };
}
