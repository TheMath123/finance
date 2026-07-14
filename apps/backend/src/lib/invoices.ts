import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { cardInvoices, transactions, type CardInvoice, type Db } from "@finance/db";
import type { InvoiceStatus } from "@finance/shared";

export interface InvoicePeriod {
  month: number; // 1-12
  year: number;
}

/**
 * Competência (regra do spec): compra com dia ≤ closing_day cai na fatura do mês
 * da compra; depois do closing_day, na fatura do mês seguinte.
 * `date` é a date local de competência (YYYY-MM-DD).
 */
export function competencePeriod(date: string, closingDay: number): InvoicePeriod {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  if (d <= closingDay) return { month: m, year: y };
  return m === 12 ? { month: 1, year: y + 1 } : { month: m + 1, year: y };
}

/** Avança um período de fatura em N meses (parcelas consecutivas). */
export function addMonths(period: InvoicePeriod, n: number): InvoicePeriod {
  const zeroBased = period.month - 1 + n;
  return { month: (zeroBased % 12) + 1, year: period.year + Math.floor(zeroBased / 12) };
}

/** Divisão de parcelas em centavos: resto do arredondamento na primeira (regra do spec). */
export function splitInstallments(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base));
}

type Tx = Pick<Db, "insert" | "select" | "query">;

/** Criação lazy da fatura do período (única por cartão+período; tolera corrida). */
export async function getOrCreateInvoice(
  tx: Tx,
  workspaceId: string,
  cardId: string,
  period: InvoicePeriod,
): Promise<CardInvoice> {
  const find = () =>
    tx.query.cardInvoices.findFirst({
      where: and(
        eq(cardInvoices.cardId, cardId),
        eq(cardInvoices.monthReference, period.month),
        eq(cardInvoices.yearReference, period.year),
      ),
    });

  const existing = await find();
  if (existing) return existing;

  const [created] = await tx
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
  if (!raced) throw new Error("falha ao criar fatura");
  return raced;
}

/**
 * Status efetivo calculado na leitura (M1, sem jobs): fatura `open` cuja data de
 * fechamento já passou é tratada como `closed`. Job pontual assume no M2.
 */
export function effectiveStatus(
  invoice: Pick<CardInvoice, "status" | "monthReference" | "yearReference">,
  closingDay: number,
  today = new Date(),
): InvoiceStatus {
  if (invoice.status !== "open") return invoice.status;
  const closing = new Date(invoice.yearReference, invoice.monthReference - 1, closingDay, 23, 59, 59);
  return today > closing ? "closed" : "open";
}

/** Total derivado: Σ despesas − Σ receitas (estornos) das transações não deletadas da fatura. */
export async function invoiceTotal(db: Tx, invoiceId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.invoiceId, invoiceId), isNull(transactions.deletedAt)));
  return Number(row?.total ?? 0);
}

/** Σ dos totais das faturas não pagas de um cartão (para o limite disponível derivado). */
export async function unpaidInvoicesTotal(db: Tx, cardId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE -${transactions.amount} END), 0)`,
    })
    .from(transactions)
    .innerJoin(cardInvoices, eq(transactions.invoiceId, cardInvoices.id))
    .where(
      and(
        eq(cardInvoices.cardId, cardId),
        ne(cardInvoices.status, "paid"),
        isNull(transactions.deletedAt),
      ),
    );
  return Number(row?.total ?? 0);
}
