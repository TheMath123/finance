import type { TransactionMethod } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import { monthlySummary } from '../summary';

export type FormulaVariableGroup =
  | 'summary'
  | 'category'
  | 'account'
  | 'card'
  | 'method';

export interface FormulaVariable {
  token: string;
  label: string;
  description: string;
  group: FormulaVariableGroup;
}

export interface FormulaCatalog {
  values: Record<string, number>;
  variables: FormulaVariable[];
}

/** `expr-eval` só aceita identificadores alfanuméricos/underscore — sem hífen. */
function categoryToken(categoryId: string): string {
  return `despesa_categoria_${categoryId.replaceAll('-', '')}`;
}
function accountToken(accountId: string): string {
  return `saldo_conta_${accountId.replaceAll('-', '')}`;
}
function cardToken(cardId: string): string {
  return `fatura_cartao_${cardId.replaceAll('-', '')}`;
}

const METHOD_TOKENS: Record<Exclude<TransactionMethod, 'transfer'>, string> = {
  pix: 'despesa_metodo_pix',
  debit: 'despesa_metodo_debito',
  cash: 'despesa_metodo_dinheiro',
  credit: 'despesa_metodo_credito',
};
const METHOD_LABELS: Record<Exclude<TransactionMethod, 'transfer'>, string> = {
  pix: 'Pix',
  debit: 'Débito',
  cash: 'Dinheiro',
  credit: 'Crédito',
};

function monthRange(year: number, month: number): { from: string; to: string } {
  const last = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, '0')}`,
  };
}

/**
 * Catálogo de variáveis pro mês pedido — mesmos números que a Home do
 * dashboard já mostra (reaproveita `monthlySummary`, sem query nova pros
 * grupos "summary"/"category"). Contas e cartões arquivados ficam de fora
 * (mesmo critério de "ativo" usado nos formulários de lançamento).
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
      group: 'summary',
    },
    {
      token: 'despesas',
      label: 'Despesas',
      description: 'Total de despesas do mês',
      group: 'summary',
    },
    {
      token: 'saldo',
      label: 'Saldo',
      description: 'Soma dos saldos de todas as contas, hoje',
      group: 'summary',
    },
  ];

  if (summary.projectedAvailable !== null) {
    values.disponivel_projetado = summary.projectedAvailable / 100;
    variables.push({
      token: 'disponivel_projetado',
      label: 'Disponível projetado',
      description: 'Saldo projetado até o fim do mês, descontando previsões',
      group: 'summary',
    });
  }

  for (const category of summary.byCategory) {
    const token = categoryToken(category.categoryId);
    values[token] = category.total / 100;
    variables.push({
      token,
      label: category.name,
      description: `Total de despesas na categoria "${category.name}" no mês`,
      group: 'category',
    });
  }

  const accounts = await deps.repos.account.listByWorkspace(actor.workspaceId);
  for (const account of accounts) {
    if (account.archivedAt !== null) continue;
    const balance =
      account.initialBalance +
      (await deps.repos.transaction.balanceDelta(account.id));
    const token = accountToken(account.id);
    values[token] = balance / 100;
    variables.push({
      token,
      label: `Saldo — ${account.name}`,
      description: `Saldo atual da conta "${account.name}"`,
      group: 'account',
    });
  }

  const cards = await deps.repos.card.listByWorkspace(actor.workspaceId);
  for (const card of cards) {
    if (card.archivedAt !== null) continue;
    const unpaid = await deps.repos.invoice.unpaidTotalByCard(card.id);
    const token = cardToken(card.id);
    values[token] = unpaid / 100;
    variables.push({
      token,
      label: `Fatura em aberto — ${card.name}`,
      description: `Total das faturas não pagas do cartão "${card.name}"`,
      group: 'card',
    });
  }

  const { from, to } = monthRange(year, month);
  const byMethod = await deps.repos.transaction.expenseByMethod(
    actor.workspaceId,
    from,
    to
  );
  for (const entry of byMethod) {
    if (entry.method === 'transfer') continue;
    const method = entry.method as Exclude<TransactionMethod, 'transfer'>;
    const token = METHOD_TOKENS[method];
    values[token] = entry.total / 100;
    variables.push({
      token,
      label: `Despesa — ${METHOD_LABELS[method]}`,
      description: `Total de despesas pagas com ${METHOD_LABELS[method]} no mês`,
      group: 'method',
    });
  }

  return { values, variables };
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
