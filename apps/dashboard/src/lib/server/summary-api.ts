import type { Either } from '@finance/shared';

import { apiRequest, type ApiError } from './api-client';

/** Espelha CategorySummary (backend, use-cases/summary/monthly-summary.ts). */
export interface CategorySummary {
	categoryId: string;
	name: string;
	color: string;
	total: number;
}

/** Espelha MethodSummary (backend, use-cases/summary/monthly-summary.ts). */
export interface MethodSummary {
	method: 'pix' | 'debit' | 'cash' | 'credit' | 'transfer';
	total: number;
}

/** Espelha MonthlySummary (backend, use-cases/summary/monthly-summary.ts). */
export interface MonthlySummary {
	year: number;
	month: number;
	income: number;
	expense: number;
	byCategory: CategorySummary[];
	byMethod: MethodSummary[];
	totalBalance: number;
	projectedAvailable: number | null;
}

export function getMonthlySummary(
	accessToken: string,
	workspaceId: string,
	year: number,
	month: number
): Promise<Either<ApiError, MonthlySummary>> {
	return apiRequest(`/workspaces/${workspaceId}/summary?year=${year}&month=${month}`, {
		accessToken
	});
}
