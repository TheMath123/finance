import { cards } from '@finance/db';
import { and, eq, isNull } from 'drizzle-orm';
import type { CardRepository } from '../../../application/ports/card-repository';
import type { DbHandle } from '../handle';

export function createCardRepository(db: DbHandle): CardRepository {
  return {
    async create(workspaceId, data) {
      const [row] = await db
        .insert(cards)
        .values({ ...data, workspaceId })
        .returning();
      if (!row) throw new Error('falha ao criar cartão');
      return row;
    },
    findInWorkspace: (workspaceId, cardId) =>
      db.query.cards.findFirst({
        where: and(eq(cards.id, cardId), eq(cards.workspaceId, workspaceId)),
      }),
    findActiveInWorkspace: (workspaceId, cardId) =>
      db.query.cards.findFirst({
        where: and(
          eq(cards.id, cardId),
          eq(cards.workspaceId, workspaceId),
          isNull(cards.archivedAt)
        ),
      }),
    listByWorkspace: (workspaceId) =>
      db.query.cards.findMany({ where: eq(cards.workspaceId, workspaceId) }),
    async update(cardId, patch) {
      const [row] = await db
        .update(cards)
        .set(patch)
        .where(eq(cards.id, cardId))
        .returning();
      if (!row) throw new Error('falha ao atualizar cartão');
      return row;
    },
    async setArchived(cardId, archived) {
      const [row] = await db
        .update(cards)
        .set({ archivedAt: archived ? new Date() : null })
        .where(eq(cards.id, cardId))
        .returning();
      if (!row) throw new Error('falha ao arquivar cartão');
      return row;
    },
    async delete(cardId) {
      await db.delete(cards).where(eq(cards.id, cardId));
    },
    async existsByBank(bankId) {
      const row = await db.query.cards.findFirst({
        where: eq(cards.bankId, bankId),
      });
      return row !== undefined;
    },
  };
}
