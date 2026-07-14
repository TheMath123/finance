import type { ZodType } from "zod";
import type { Db } from "@finance/db";
import type { WorkspaceRole } from "@finance/shared";
import { left, right, type Either } from "@finance/shared";
import { verifyAccessToken } from "./tokens";
import { getMembership, roleAtLeast } from "./authz";
import { isRateLimited } from "./rate-limit";
import { securityLog } from "./log";

export interface HttpError {
  status: number;
  code: string;
  message: string;
  issues?: { path: string; message: string }[];
}

interface StatusSetter {
  status?: number | string;
}

export function fail(set: StatusSetter, error: HttpError) {
  set.status = error.status;
  return { error: { code: error.code, message: error.message, issues: error.issues } };
}

/** Valida body/query com Zod (400 com issues). */
export function parse<T>(schema: ZodType<T>, body: unknown): Either<HttpError, T> {
  const result = schema.safeParse(body);
  if (result.success) return right(result.data);
  return left({
    status: 400,
    code: "validation_error",
    message: "Payload inválido.",
    issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

/**
 * Valida path params com Zod (spec: toda entrada HTTP validada na borda).
 * Param malformado responde 404 genérico — um UUID inválido não identifica recurso algum,
 * e o 404 não diferencia "malformado" de "inexistente" (não vira oráculo).
 */
export function parseParams<T>(schema: ZodType<T>, params: unknown): Either<HttpError, T> {
  const result = schema.safeParse(params);
  if (result.success) return right(result.data);
  return left({ status: 404, code: "not_found", message: "Recurso não encontrado." });
}

export interface Actor {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

/** Limite geral por usuário autenticado (camada 3 do plano de rate limiting). */
const USER_RATE_MAX = 300;
const USER_RATE_WINDOW_MS = 60_000;

/**
 * Autentica o Bearer token, aplica o limite por usuário e valida membership + papel
 * mínimo no workspace (spec: autorização por workspace).
 */
export async function requireRole(
  deps: { db: Db; jwtSecret: string },
  request: Request,
  workspaceId: string,
  minRole: WorkspaceRole,
): Promise<Either<HttpError, Actor>> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? await verifyAccessToken(deps.jwtSecret, token) : null;
  if (!payload) {
    return left({ status: 401, code: "unauthorized", message: "Autenticação necessária." });
  }

  if (isRateLimited(`user:${payload.userId}`, USER_RATE_MAX, USER_RATE_WINDOW_MS)) {
    securityLog("rate_limited", { scopeKey: "user", userId: payload.userId });
    return left({
      status: 429,
      code: "rate_limited",
      message: "Muitas requisições. Aguarde um instante.",
    });
  }

  const role = await getMembership(deps.db, workspaceId, payload.userId);
  if (!role) {
    // 404 (não 403) para não revelar a existência do workspace a não-membros
    return left({ status: 404, code: "not_found", message: "Workspace não encontrado." });
  }
  if (!roleAtLeast(role, minRole)) {
    return left({ status: 403, code: "forbidden", message: "Papel sem permissão para esta ação." });
  }
  return right({ userId: payload.userId, workspaceId, role });
}
