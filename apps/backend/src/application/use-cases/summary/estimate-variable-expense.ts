import type { Actor, UseCaseDeps } from '../../deps';

/** Meses completos de histórico usados na média — mês corrente fica de fora (ainda em andamento). */
const HISTORY_MONTHS = 3;
/** Cache curto: recalcular a cada request seria caro sem necessidade (a média muda devagar). */
const CACHE_TTL_SECONDS = 6 * 60 * 60;

export interface VariableExpenseCategoryEstimate {
  categoryId: string;
  name: string;
  color: string;
  estimated: number;
}

export interface VariableExpenseEstimate {
  byCategory: VariableExpenseCategoryEstimate[];
  total: number;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Janela dos últimos `HISTORY_MONTHS` meses completos anteriores ao mês corrente. */
function historyWindow(today: Date): { from: string; to: string } {
  const firstOfCurrentMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );
  const to = new Date(firstOfCurrentMonth.getTime() - 1);
  const from = new Date(
    to.getFullYear(),
    to.getMonth() - (HISTORY_MONTHS - 1),
    1
  );
  return { from: isoDate(from), to: isoDate(to) };
}

function cacheKey(workspaceId: string): string {
  return `variable-expense-estimate:${workspaceId}`;
}

/**
 * M2-08: estimativa de gasto variável por categoria (mercado, lazer etc. —
 * o que não é recorrência nem parcela). Fallback determinístico do spec
 * ("média histórica") *é* a estratégia inteira aqui — sem chamada de IA,
 * sem custo de token, sem risco de indisponibilidade. Cacheado por
 * workspace: é um cálculo relativamente caro (agregação sobre 3 meses de
 * transações) pra rodar em toda consulta de resumo mensal.
 */
export async function estimateVariableExpense(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>,
  actor: Actor
): Promise<VariableExpenseEstimate> {
  const key = cacheKey(actor.workspaceId);
  const cached = await deps.cache.get<VariableExpenseEstimate>(key);
  if (cached) return cached;

  const { from, to } = historyWindow(new Date());
  const rows = await deps.repos.transaction.variableExpenseByCategory(
    actor.workspaceId,
    from,
    to
  );

  const byCategory = rows.map((r) => ({
    categoryId: r.categoryId,
    name: r.name,
    color: r.color,
    estimated: Math.round(r.total / HISTORY_MONTHS),
  }));
  const total = byCategory.reduce((sum, c) => sum + c.estimated, 0);
  const result: VariableExpenseEstimate = { byCategory, total };

  await deps.cache.set(key, result, CACHE_TTL_SECONDS);
  return result;
}
