import type { Actor, UseCaseDeps } from '../../deps';
import { monthlySummary } from '../summary';

export interface FormulaVariable {
  token: string;
  label: string;
  description: string;
}

export interface FormulaCatalog {
  values: Record<string, number>;
  variables: FormulaVariable[];
}

/** `expr-eval` só aceita identificadores alfanuméricos/underscore — sem hífen. */
function categoryToken(categoryId: string): string {
  return `despesa_categoria_${categoryId.replaceAll('-', '')}`;
}

/**
 * Catálogo de variáveis pro mês pedido — mesmos números que a Home do
 * dashboard já mostra (reaproveita `monthlySummary`, sem query nova).
 *
 * Valores entram em **reais** (não centavos): números que o usuário digita
 * na calculadora são naturalmente reais ("8+8" = dezesseis reais) — expor as
 * variáveis em centavos faria qualquer fórmula que misturasse uma variável
 * com um literal digitado dar um resultado 100x menor que o esperado.
 */
export async function buildFormulaCatalog(
  deps: Pick<UseCaseDeps, 'repos' | 'cache'>,
  actor: Actor,
  year: number,
  month: number
): Promise<FormulaCatalog> {
  const summary = await monthlySummary(deps, actor, year, month);
  const income = summary.income / 100;
  const expense = summary.expense / 100;
  const totalBalance = summary.totalBalance / 100;

  const values: Record<string, number> = {
    receitas: income,
    despesas: expense,
    saldo: totalBalance,
  };
  const variables: FormulaVariable[] = [
    {
      token: 'receitas',
      label: 'Receitas',
      description: 'Total de receitas do mês',
    },
    {
      token: 'despesas',
      label: 'Despesas',
      description: 'Total de despesas do mês',
    },
    {
      token: 'saldo',
      label: 'Saldo',
      description: 'Soma dos saldos de todas as contas, hoje',
    },
  ];

  if (summary.projectedAvailable !== null) {
    values.disponivel_projetado = summary.projectedAvailable / 100;
    variables.push({
      token: 'disponivel_projetado',
      label: 'Disponível projetado',
      description: 'Saldo projetado até o fim do mês, descontando previsões',
    });
  }

  for (const category of summary.byCategory) {
    const token = categoryToken(category.categoryId);
    values[token] = category.total / 100;
    variables.push({
      token,
      label: category.name,
      description: `Total de despesas na categoria "${category.name}" no mês`,
    });
  }

  return { values, variables };
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
