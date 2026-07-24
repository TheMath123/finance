import { cardInvoices, cards, transactions } from '@finance/db';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import type { InvoiceRepository } from '../../../application/ports/invoice-repository';
import type { DbHandle } from '../handle';

export function createInvoiceRepository(db: DbHandle): InvoiceRepository {
  const signedTotal = sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)`;

  return {
    findInWorkspace: (workspaceId, invoiceId) =>
      db.query.cardInvoices.findFirst({
        where: and(
          eq(cardInvoices.id, invoiceId),
          eq(cardInvoices.workspaceId, workspaceId)
        ),
      }),
    findById: (invoiceId) =>
      db.query.cardInvoices.findFirst({
        where: eq(cardInvoices.id, invoiceId),
      }),
    async getOrCreate(workspaceId, cardId, period) {
      const find = () =>
        db.query.cardInvoices.findFirst({
          where: and(
            eq(cardInvoices.cardId, cardId),
            eq(cardInvoices.monthReference, period.month),
            eq(cardInvoices.yearReference, period.year)
          ),
        });
      const existing = await find();
      if (existing) return existing;
      const [created] = await db
        .insert(cardInvoices)
        .values({
          workspaceId,
          cardId,
          monthReference: period.month,
          yearReference: period.year,
        })
        .onConflictDoNothing()
        .returning();
      if (created) return created;
      const raced = await find();
      if (!raced) throw new Error('falha ao criar fatura');
      return raced;
    },
    listByCard: (cardId) =>
      db.query.cardInvoices.findMany({
        where: eq(cardInvoices.cardId, cardId),
        orderBy: [
          desc(cardInvoices.yearReference),
          desc(cardInvoices.monthReference),
        ],
      }),
    async setStatus(invoiceId, status) {
      await db
        .update(cardInvoices)
        .set({ status })
        .where(eq(cardInvoices.id, invoiceId));
    },
    async markPaid(invoiceId, paymentTransactionId) {
      // Condicional (WHERE status <> 'paid') — fecha a corrida de duas chamadas
      // paralelas de pagamento gerarem dois pagamentos reais (auditoria 2026-07-19).
      // undefined = outra chamada já marcou paga primeiro.
      const [row] = await db
        .update(cardInvoices)
        .set({ status: 'paid', paymentTransactionId })
        .where(
          and(eq(cardInvoices.id, invoiceId), ne(cardInvoices.status, 'paid'))
        )
        .returning();
      return row;
    },
    async total(invoiceId) {
      const [row] = await db
        .select({ total: signedTotal })
        .from(transactions)
        .where(
          and(
            eq(transactions.invoiceId, invoiceId),
            isNull(transactions.deletedAt)
          )
        );
      return Number(row?.total ?? 0);
    },
    async unpaidTotalByCard(cardId) {
      const [row] = await db
        .select({ total: signedTotal })
        .from(transactions)
        .innerJoin(cardInvoices, eq(transactions.invoiceId, cardInvoices.id))
        .where(
          and(
            eq(cardInvoices.cardId, cardId),
            ne(cardInvoices.status, 'paid'),
            isNull(transactions.deletedAt)
          )
        );
      return Number(row?.total ?? 0);
    },
    async listUnpaidWithDue(workspaceId) {
      const rows = await db
        .select({
          id: cardInvoices.id,
          month: cardInvoices.monthReference,
          year: cardInvoices.yearReference,
          dueDay: cards.dueDay,
        })
        .from(cardInvoices)
        .innerJoin(cards, eq(cardInvoices.cardId, cards.id))
        .where(
          and(
            eq(cardInvoices.workspaceId, workspaceId),
            ne(cardInvoices.status, 'paid')
          )
        );
      return rows;
    },
    async deleteByCard(cardId) {
      await db.delete(cardInvoices).where(eq(cardInvoices.cardId, cardId));
    },
    async listAllOpen() {
      const rows = await db
        .select({
          invoice: cardInvoices,
          closingDay: cards.closingDay,
          cardName: cards.name,
        })
        .from(cardInvoices)
        .innerJoin(cards, eq(cardInvoices.cardId, cards.id))
        .where(eq(cardInvoices.status, 'open'));
      return rows;
    },
    async listAllClosedUnpaid() {
      const rows = await db
        .select({
          invoice: cardInvoices,
          dueDay: cards.dueDay,
          cardName: cards.name,
        })
        .from(cardInvoices)
        .innerJoin(cards, eq(cardInvoices.cardId, cards.id))
        .where(eq(cardInvoices.status, 'closed'));
      return rows;
    },
  };
}
