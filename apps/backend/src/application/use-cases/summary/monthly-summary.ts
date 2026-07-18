import type { Actor, UseCaseDeps } from "../../deps";
import { listPendingOccurrences } from "../recurring/list-pending-occurrences";

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
   * − faturas não pagas com vencimento até o fim do mês. Null para meses encerrados.
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
  deps: Pick<UseCaseDeps, "repos">,
  actor: Actor,
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const { from, to } = monthRange(year, month);

  const totals = await deps.repos.transaction.monthlyTotals(actor.workspaceId, from, to);
  const byCategory = await deps.repos.transaction.expenseByCategory(actor.workspaceId, from, to);

  // Σ saldos derivados de todas as contas
  const accounts = await deps.repos.account.listByWorkspace(actor.workspaceId);
  let totalBalance = 0;
  for (const account of accounts) {
    totalBalance += account.initialBalance + (await deps.repos.transaction.balanceDelta(account.id));
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
    const unpaid = await deps.repos.invoice.listUnpaidWithDue(actor.workspaceId);
    let unpaidDue = 0;
    for (const invoice of unpaid) {
      const lastDay = new Date(invoice.year, invoice.month, 0).getDate();
      const due = `${invoice.year}-${String(invoice.month).padStart(2, "0")}-${String(Math.min(invoice.dueDay, lastDay)).padStart(2, "0")}`;
      if (due <= to) unpaidDue += await deps.repos.invoice.total(invoice.id);
    }

    projectedAvailable = totalBalance + pendingIncome - pendingExpense - unpaidDue;
  }

  return {
    year,
    month,
    income: totals.income,
    expense: totals.expense,
    byCategory: byCategory.sort((a, b) => b.total - a.total),
    totalBalance,
    projectedAvailable,
  };
}
