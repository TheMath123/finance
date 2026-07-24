import { interUserTransfers } from '@finance/db';
import { and, eq, lt } from 'drizzle-orm';
import type { InterUserTransferRepository } from '../../../application/ports/inter-user-transfer-repository';
import type { DbHandle } from '../handle';

export function createInterUserTransferRepository(
  db: DbHandle
): InterUserTransferRepository {
  return {
    async create(data) {
      const [row] = await db
        .insert(interUserTransfers)
        .values(data)
        .returning();
      if (!row) throw new Error('falha ao criar transferência');
      return row;
    },
    findById: (id) =>
      db.query.interUserTransfers.findFirst({
        where: eq(interUserTransfers.id, id),
      }),
    listPendingForUser: (userId) =>
      db.query.interUserTransfers.findMany({
        where: and(
          eq(interUserTransfers.toUserId, userId),
          eq(interUserTransfers.status, 'pending')
        ),
      }),
    async accept(id, toTransactionId) {
      // Condicional (WHERE status='pending') — fecha a corrida de duas chamadas
      // paralelas de accept/reject decidirem o mesmo transfer (auditoria 2026-07-19).
      // undefined = já foi finalizado por outra chamada; quem chama trata o rollback.
      const [row] = await db
        .update(interUserTransfers)
        .set({ status: 'accepted', toTransactionId })
        .where(
          and(
            eq(interUserTransfers.id, id),
            eq(interUserTransfers.status, 'pending')
          )
        )
        .returning();
      return row;
    },
    async reject(id) {
      const [row] = await db
        .update(interUserTransfers)
        .set({ status: 'rejected' })
        .where(
          and(
            eq(interUserTransfers.id, id),
            eq(interUserTransfers.status, 'pending')
          )
        )
        .returning();
      return row;
    },
    listExpired: (now) =>
      db.query.interUserTransfers.findMany({
        where: and(
          eq(interUserTransfers.status, 'pending'),
          lt(interUserTransfers.expiresAt, now)
        ),
      }),
    async markExpired(id) {
      await db
        .update(interUserTransfers)
        .set({ status: 'expired' })
        .where(eq(interUserTransfers.id, id));
    },
  };
}
