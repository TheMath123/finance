import { left, right, type Either } from '@finance/shared';

import { env } from './env';

/** Envelope de erro da API (espelha HttpError de apps/backend/src/http/http-error.ts). */
export interface ApiError {
	status: number;
	code: string;
	message: string;
}

export interface PlanLimitsView {
	maxOwnedSharedWorkspaces: number;
	maxMembersPerWorkspace: number;
	maxSavedFormulasPerWorkspace: number;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix';

export interface PlanPriceView {
	id: string;
	planId: string;
	billingIntervalUnit: 'day' | 'week' | 'month' | 'year';
	billingIntervalCount: number;
	priceCents: number;
	maxInstallments: number;
	paymentMethods: PaymentMethod[];
	isDefault: boolean;
	sortOrder: number;
}

export interface PlanView {
	id: string;
	key: string;
	name: string;
	description: string | null;
	trialDays: number;
	limits: PlanLimitsView;
	features: string[];
	isActive: boolean;
	sortOrder: number;
	prices: PlanPriceView[];
}

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Cliente HTTP mínimo pro backend — server-only (lib/server/), mesmo padrão
 * do dashboard (ver apps/dashboard/src/lib/server/api-client.ts), mas só a
 * fatia necessária pro site institucional: uma chamada pública, sem token
 * (GET /plans não exige autenticação — ver apps/backend/src/http/modules/
 * billing/routes/plans.ts).
 */
export async function listPublicPlans(): Promise<Either<ApiError, PlanView[]>> {
	let response: Response;
	try {
		response = await fetch(new URL('/plans', env.API_URL), {
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
	} catch {
		return left({
			status: 0,
			code: 'network_error',
			message: 'Não foi possível falar com o servidor.'
		});
	}

	if (!response.ok) {
		return left({
			status: response.status,
			code: 'unknown_error',
			message: 'Erro inesperado ao buscar os planos.'
		});
	}

	return right((await response.json()) as PlanView[]);
}
