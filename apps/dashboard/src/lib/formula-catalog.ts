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
 *
 * Valores entram em **reais** (não centavos): números digitados pelo usuário
 * no teclado da calculadora são naturalmente reais ("8+8" = dezesseis reais),
 * então o catálogo converte de centavos (armazenamento interno) pra reais
 * antes de expor as variáveis — senão misturar "despesas" (centavos) com um
 * literal digitado ("8") dava resultado 100x menor que o esperado.
 */
export function buildClientFormulaCatalog(summary: MonthlySummary): {
	values: Record<string, number>;
	variables: FormulaVariableValue[];
} {
	const income = summary.income / 100;
	const expense = summary.expense / 100;
	const totalBalance = summary.totalBalance / 100;

	const values: Record<string, number> = {
		receitas: income,
		despesas: expense,
		saldo: totalBalance
	};
	const variables: FormulaVariableValue[] = [
		{
			token: 'receitas',
			label: 'Receitas',
			description: 'Total de receitas do mês',
			value: income
		},
		{
			token: 'despesas',
			label: 'Despesas',
			description: 'Total de despesas do mês',
			value: expense
		},
		{
			token: 'saldo',
			label: 'Saldo',
			description: 'Soma dos saldos de todas as contas, hoje',
			value: totalBalance
		}
	];

	if (summary.projectedAvailable !== null) {
		const projectedAvailable = summary.projectedAvailable / 100;
		values.disponivel_projetado = projectedAvailable;
		variables.push({
			token: 'disponivel_projetado',
			label: 'Disponível projetado',
			description: 'Saldo projetado até o fim do mês, descontando previsões',
			value: projectedAvailable
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
			value: total
		});
	}

	return { values, variables };
}
