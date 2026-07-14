import { and, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";
import {
  bankAccounts,
  cardInvoices,
  cards,
  categories,
  transactions,
  type Db,
} from "@finance/db";
import type { Actor } from "../../lib/http";
import { invoiceTotal } from "../../lib/invoices";
import { accountBalance } from "../transaction/service";
import { listPendingOccurrences } from "../recurring/service";

export interface SummaryDeps {
  db: Db;
}

export interface CategorySummary {
  categoryId: string;
  name: string;
  color: string;
  total: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  /** Receitas do mês por competência (transferências fora — movimentação neutra). */
  income: number;
  /** Despesas do mês por competência (inclui compras no crédito pela data da compra). */
  expense: number;
  byCategory: CategorySummary[];
  /** Σ saldos derivados de todas as contas, hoje. */
  totalBalance: number;
  /**
   * Disponível projetado até o fim do mês (fórmula do spec):
   * saldos + receitas recorrentes previstas − despesas recorrentes previstas
   * − faturas não pagas com vencimento até o fim do mês.
   * Null para meses já encerrados.
   */
  projectedAvailable: number | null;
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const last = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function monthlySummary(
  deps: SummaryDeps,
  actor: Actor,
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const { db } = deps;
  const { from, to } = monthRange(year, month);

  // Receitas/despesas do mês (sem transferências, sem soft-deletadas)
  const baseWhere = and(
    eq(transactions.workspaceId, actor.workspaceId),
    isNull(transactions.deletedAt),
    ne(transactions.method, "transfer"),
    gte(transactions.date, from),
    lte(transactions.date, to),
  );
  const [totals] = await db
    .select({
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(baseWhere);

  const byCategoryRows = await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      color: categories.color,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(baseWhere, eq(transactions.type, "expense")))
    .groupBy(transactions.categoryId, categories.name, categories.color);

  // Σ saldos derivados de todas as contas
  const accounts = await db.query.bankAccounts.findMany({
    where: eq(bankAccounts.workspaceId, actor.workspaceId),
  });
  let totalBalance = 0;
  for (const account of accounts) {
    totalBalance += await accountBalance(db, account.id);
  }

  // Projeção: só para o mês corrente ou futuro
  const today = todayIso();
  let projectedAvailable: number | null = null;
  if (to >= today) {
    // Recorrências previstas (não confirmadas) de hoje até o fim do mês pedido
    let pendingIncome = 0;
    let pendingExpense = 0;
    const [ty, tm] = today.split("-").map(Number) as [number, number];
    let y = ty;
    let m = tm;
    while (y < year || (y === year && m <= month)) {
      const pending = await listPendingOccurrences(deps, actor, y, m);
      for (const p of pending) {
        if (p.date < today || p.date > to) continue;
        if (p.type === "income") pendingIncome += p.amount;
        else pendingExpense += p.amount;
      }
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }

    // Faturas não pagas com vencimento até o fim do mês pedido (parcelas futuras inclusas)
    const unpaid = await db
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
          eq(cardInvoices.workspaceId, actor.workspaceId),
          ne(cardInvoices.status, "paid"),
        ),
      );
    let unpaidDue = 0;
    for (const invoice of unpaid) {
      const due = `${invoice.year}-${String(invoice.month).padStart(2, "0")}-${String(Math.min(invoice.dueDay, new Date(invoice.year, invoice.month, 0).getDate())).padStart(2, "0")}`;
      if (due <= to) unpaidDue += await invoiceTotal(db, invoice.id);
    }

    projectedAvailable = totalBalance + pendingIncome - pendingExpense - unpaidDue;
  }

  return {
    year,
    month,
    income: Number(totals?.income ?? 0),
    expense: Number(totals?.expense ?? 0),
    byCategory: byCategoryRows
      .map((r) => ({ ...r, total: Number(r.total) }))
      .sort((a, b) => b.total - a.total),
    totalBalance,
    projectedAvailable,
  };
}
