import { left, right, type Either } from '@finance/shared';

import { env } from './env';

/** Envelope de erro da API (espelha HttpError de apps/backend/src/http/http-error.ts). */
export interface ApiError {
	status: number;
	code: string;
	message: string;
	issues?: { path: string; message: string }[];
}

interface ApiRequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	accessToken?: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Cliente HTTP pro backend — server-only (lib/server/). Toda chamada à API
 * parte daqui; o client nunca fala com o backend diretamente (spec: "Dashboard
 * web"). O Bearer token vem do cookie de sessão lido pelo caller, nunca de
 * estado global.
 */
export async function apiRequest<T>(
	path: string,
	options: ApiRequestOptions = {}
): Promise<Either<ApiError, T>> {
	const { method = 'GET', body, accessToken } = options;

	const headers: Record<string, string> = {};
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

	let response: Response;
	try {
		response = await fetch(new URL(path, env.API_URL), {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
	} catch {
		return left({
			status: 0,
			code: 'network_error',
			message: 'Não foi possível falar com o servidor. Tente novamente.'
		});
	}

	if (response.status === 204) return right(undefined as T);

	if (!response.ok) {
		const fallback: ApiError = {
			status: response.status,
			code: 'unknown_error',
			message: 'Erro inesperado no servidor.'
		};
		try {
			const payload = (await response.json()) as { error?: Omit<ApiError, 'status'> };
			if (!payload.error) return left(fallback);
			return left({ status: response.status, ...payload.error });
		} catch {
			return left(fallback);
		}
	}

	return right((await response.json()) as T);
}
