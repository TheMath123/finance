import { env } from "@/env";
import { tokenStore } from "@/lib/secure-store";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Não tenta refresh de sessão nem anexa Authorization (usado por login/register/refresh). */
  skipAuth?: boolean;
}

async function rawRequest<T>(path: string, { body, skipAuth, headers, ...init }: RequestOptions) {
  const accessToken = skipAuth ? null : await tokenStore.getAccessToken();

  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = data?.error ?? { code: "unknown_error", message: "Erro inesperado" };
    throw new ApiError(response.status, error.code, error.message, error.issues);
  }

  return data as T;
}

/** Faz uma requisição autenticada; em 401, tenta renovar a sessão uma única vez antes de desistir. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || options.skipAuth) throw error;

    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) throw error;

    const session = await rawRequest<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuth: true,
    }).catch(() => null);

    if (!session) {
      await tokenStore.clearTokens();
      throw error;
    }

    await tokenStore.setTokens(session.accessToken, session.refreshToken);
    return rawRequest<T>(path, options);
  }
}

async function rawTextRequest(path: string, { skipAuth, headers, ...init }: Omit<RequestOptions, "body">) {
  const accessToken = skipAuth ? null : await tokenStore.getAccessToken();

  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => undefined);
    const error = data?.error ?? { code: "unknown_error", message: "Erro inesperado" };
    throw new ApiError(response.status, error.code, error.message, error.issues);
  }

  return response.text();
}

/** Igual a `apiRequest`, mas devolve o corpo cru como texto (ex.: export CSV) em vez de fazer parse de JSON. */
export async function apiRequestText(path: string, options: Omit<RequestOptions, "body"> = {}): Promise<string> {
  try {
    return await rawTextRequest(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || options.skipAuth) throw error;

    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) throw error;

    const session = await rawRequest<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      skipAuth: true,
    }).catch(() => null);

    if (!session) {
      await tokenStore.clearTokens();
      throw error;
    }

    await tokenStore.setTokens(session.accessToken, session.refreshToken);
    return rawTextRequest(path, options);
  }
}
