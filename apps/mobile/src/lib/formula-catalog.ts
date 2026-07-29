import type { Account } from '@/lib/accounts-api';
import type { Card } from '@/lib/cards-api';
import type { MonthlySummary } from '@/lib/summary-api';

export type FormulaVariableGroup =
  | 'summary'
  | 'category'
  | 'account'
  | 'card'
  | 'method';

export interface FormulaVariableValue {
  token: string;
  label: string;
  description: string;
  group: FormulaVariableGroup;
  value: number;
}

/** Mesma regra do backend (application/use-cases/saved-formula/formula-variables.ts) — expr-eval só aceita identificadores alfanuméricos/underscore. */
function categoryToken(categoryId: string): string {
  return `despesa_categoria_${categoryId.replaceAll('-', '')}`;
}
function accountToken(accountId: string): string {
  return `saldo_conta_${accountId.replaceAll('-', '')}`;
}
function cardToken(cardId: string): string {
  return `fatura_cartao_${cardId.replaceAll('-', '')}`;
}

const METHOD_TOKENS = {
  pix: 'despesa_metodo_pix',
  debit: 'despesa_metodo_debito',
  cash: 'despesa_metodo_dinheiro',
  credit: 'despesa_metodo_credito',
} as const;
const METHOD_LABELS = {
  pix: 'Pix',
  debit: 'Débito',
  cash: 'Dinheiro',
  credit: 'Crédito',
} as const;

/**
 * Catálogo de variáveis pro preview ao vivo no app — mesmos números que o
 * resumo mensal (+ contas/cartões, quando informados) já carregados na
 * tela, sem round-trip pro backend a cada toque no teclado. A avaliação
 * final ao salvar continua sendo validada pelo backend (essa aqui é só
 * feedback visual). Espelha apps/dashboard/src/lib/formula-catalog.ts e
 * formula-variables.ts do backend.
 *
 * Valores entram em **reais** (não centavos) — números digitados no teclado
 * da calculadora são naturalmente reais ("8+8" = dezesseis reais), então o
 * catálogo converte de centavos (armazenamento interno) pra reais antes de
 * expor as variáveis.
 */
export function buildClientFormulaCatalog(
  summary: MonthlySummary,
  accounts: Account[] = [],
  cards: Card[] = []
): {
  values: Record<string, number>;
  variables: FormulaVariableValue[];
} {
  const income = summary.income / 100;
  const expense = summary.expense / 100;
  const totalBalance = summary.totalBalance / 100;

  const values: Record<string, number> = {
    receitas: income,
    despesas: expense,
    saldo: totalBalance,
  };
  const variables: FormulaVariableValue[] = [
    {
      token: 'receitas',
      label: 'Receitas',
      description: 'Total de receitas do mês',
      group: 'summary',
      value: income,
    },
    {
      token: 'despesas',
      label: 'Despesas',
      description: 'Total de despesas do mês',
      group: 'summary',
      value: expense,
    },
    {
      token: 'saldo',
      label: 'Saldo',
      description: 'Soma dos saldos de todas as contas, hoje',
      group: 'summary',
      value: totalBalance,
    },
  ];

  if (summary.projectedAvailable !== null) {
    const projectedAvailable = summary.projectedAvailable / 100;
    values.disponivel_projetado = projectedAvailable;
    variables.push({
      token: 'disponivel_projetado',
      label: 'Disponível projetado',
      description: 'Saldo projetado até o fim do mês, descontando previsões',
      group: 'summary',
      value: projectedAvailable,
    });
  }

  for (const category of summary.byCategory) {
    const token = categoryToken(category.categoryId);
    const total = category.total / 100;
    values[token] = total;
    variables.push({
      token,
      label: category.name,
      description: `Total de despesas na categoria "${category.name}" no mês`,
      group: 'category',
      value: total,
    });
  }

  for (const account of accounts) {
    if (account.archivedAt !== null) continue;
    const token = accountToken(account.id);
    const balance = account.balance / 100;
    values[token] = balance;
    variables.push({
      token,
      label: `Saldo — ${account.name}`,
      description: `Saldo atual da conta "${account.name}"`,
      group: 'account',
      value: balance,
    });
  }

  for (const card of cards) {
    if (card.archivedAt !== null) continue;
    const token = cardToken(card.id);
    const unpaid = (card.limit - card.availableLimit) / 100;
    values[token] = unpaid;
    variables.push({
      token,
      label: `Fatura em aberto — ${card.name}`,
      description: `Total das faturas não pagas do cartão "${card.name}"`,
      group: 'card',
      value: unpaid,
    });
  }

  for (const entry of summary.byMethod) {
    if (entry.method === 'transfer') continue;
    const method = entry.method;
    const token = METHOD_TOKENS[method];
    const total = entry.total / 100;
    values[token] = total;
    variables.push({
      token,
      label: `Despesa — ${METHOD_LABELS[method]}`,
      description: `Total de despesas pagas com ${METHOD_LABELS[method]} no mês`,
      group: 'method',
      value: total,
    });
  }

  return { values, variables };
}
