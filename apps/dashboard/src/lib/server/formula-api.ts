import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha SavedFormula (backend, domain/entities/saved-formula.ts — datas serializadas). */
export interface SavedFormulaView {
	id: string;
	workspaceId: string;
	createdByUserId: string;
	name: string;
	expression: string;
	displayFormat: 'currency' | 'number';
	pinnedHome: boolean;
	pinnedTransactions: boolean;
	/** Ordem de exibição do widget fixado (drag-and-drop, M5-01c) — null quando não fixada naquela tela. */
	homeOrder: number | null;
	transactionsOrder: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface FormulaVariableView {
	token: string;
	label: string;
	description: string;
}

export interface SavedFormulaInput {
	name: string;
	expression: string;
	displayFormat: 'currency' | 'number';
	pinnedHome: boolean;
	pinnedTransactions: boolean;
}

export interface EvaluatedFormulaView {
	value: number;
	displayFormat: 'currency' | 'number';
}

export function listFormulas(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, SavedFormulaView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/saved-formulas`, { accessToken });
}

export function listFormulaVariables(
	accessToken: string,
	workspaceId: string
): Promise<Either<ApiError, FormulaVariableView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/saved-formulas/variables`, { accessToken });
}

export function createFormula(
	accessToken: string,
	workspaceId: string,
	input: SavedFormulaInput
): Promise<Either<ApiError, SavedFormulaView>> {
	return apiRequest(`/workspaces/${workspaceId}/saved-formulas`, {
		method: 'POST',
		body: input,
		accessToken
	});
}

export function updateFormula(
	accessToken: string,
	workspaceId: string,
	formulaId: string,
	input: Partial<SavedFormulaInput>
): Promise<Either<ApiError, SavedFormulaView>> {
	return apiRequest(`/workspaces/${workspaceId}/saved-formulas/${formulaId}`, {
		method: 'PATCH',
		body: input,
		accessToken
	});
}

export function deleteFormula(
	accessToken: string,
	workspaceId: string,
	formulaId: string
): Promise<Either<ApiError, unknown>> {
	return apiRequest(`/workspaces/${workspaceId}/saved-formulas/${formulaId}`, {
		method: 'DELETE',
		accessToken
	});
}

export function evaluateFormula(
	accessToken: string,
	workspaceId: string,
	formulaId: string
): Promise<Either<ApiError, EvaluatedFormulaView>> {
	return apiRequest(`/workspaces/${workspaceId}/saved-formulas/${formulaId}/evaluate`, {
		accessToken
	});
}

export function reorderFormulas(
	accessToken: string,
	workspaceId: string,
	field: 'home' | 'transactions',
	formulaIds: string[]
): Promise<Either<ApiError, SavedFormulaView[]>> {
	return apiRequest(`/workspaces/${workspaceId}/saved-formulas/reorder`, {
		method: 'PATCH',
		body: { field, formulaIds },
		accessToken
	});
}
