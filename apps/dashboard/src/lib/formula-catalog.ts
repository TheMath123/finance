import type { MonthlySummary } from '$lib/server/summary-api';

export interface FormulaVariableValue {
	token: string;
	label: string;
	description: string;
	value: number;
}

/** Mesma regra do backend (application/use-cases/saved-formula/formula-variables.ts) — expr-eval só aceita identificadores alfanuméricos/underscore. */
function categoryToken(categoryId: string): string {
	return `despesa_categoria_${categoryId.replaceAll('-', '')}`;
}

/**
 * Catálogo de variáveis pro preview ao vivo no client — mesmos números que o
 * resumo mensal já carregado na página (`data.summary`), sem round-trip pro
 * backend a cada tecla. A avaliação final ao salvar continua sendo validada
 * pelo backend (essa aqui é só feedback visual).
 */
export function buildClientFormulaCatalog(summary: MonthlySummary): {
	values: Record<string, number>;
	variables: FormulaVariableValue[];
} {
	const values: Record<string, number> = {
		receitas: summary.income,
		despesas: summary.expense,
		saldo: summary.totalBalance
	};
	const variables: FormulaVariableValue[] = [
		{
			token: 'receitas',
			label: 'Receitas',
			description: 'Total de receitas do mês',
			value: summary.income
		},
		{
			token: 'despesas',
			label: 'Despesas',
			description: 'Total de despesas do mês',
			value: summary.expense
		},
		{
			token: 'saldo',
			label: 'Saldo',
			description: 'Soma dos saldos de todas as contas, hoje',
			value: summary.totalBalance
		}
	];

	if (summary.projectedAvailable !== null) {
		values.disponivel_projetado = summary.projectedAvailable;
		variables.push({
			token: 'disponivel_projetado',
			label: 'Disponível projetado',
			description: 'Saldo projetado até o fim do mês, descontando previsões',
			value: summary.projectedAvailable
		});
	}

	for (const category of summary.byCategory) {
		const token = categoryToken(category.categoryId);
		values[token] = category.total;
		variables.push({
			token,
			label: category.name,
			description: `Total de despesas na categoria "${category.name}" no mês`,
			value: category.total
		});
	}

	return { values, variables };
}
