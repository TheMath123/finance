import { left, right, type Either } from "@finance/shared";
import type { WorkspaceRole } from "@finance/shared";
import { roleAtLeast } from "../domain/services/authorization";
import type { Actor } from "../application/deps";
import type { AppDeps } from "./deps";
import type { HttpError } from "./http-error";

/** Limite geral por usuário autenticado (camada 3 do plano de rate limiting). */
const USER_RATE_MAX = 300;
const USER_RATE_WINDOW_MS = 60_000;

/** Autentica o Bearer token (usuário logado, sem exigir papel em workspace). */
export async function requireAuthenticated(
  deps: AppDeps,
  request: Request,
): Promise<Either<HttpError, { userId: string }>> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? await deps.tokens.verifyAccess(token) : null;
  if (!payload) {
    return left({ status: 401, code: "unauthorized", message: "Autenticação necessária." });
  }
  return right(payload);
}

/**
 * Autentica, aplica o limite por usuário e valida membership + papel mínimo no
 * workspace (spec: autorização por workspace).
 */
export async function requireWorkspaceRole(
  deps: AppDeps,
  request: Request,
  workspaceId: string,
  minRole: WorkspaceRole,
): Promise<Either<HttpError, Actor>> {
  const auth = await requireAuthenticated(deps, request);
  if (!auth.ok) return auth;

  if (deps.rateLimiter.isLimited(`user:${auth.value.userId}`, USER_RATE_MAX, USER_RATE_WINDOW_MS)) {
    deps.logger.log("rate_limited", { scopeKey: "user", userId: auth.value.userId });
    return left({
      status: 429,
      code: "rate_limited",
      message: "Muitas requisições. Aguarde um instante.",
    });
  }

  const role = await deps.repos.workspace.getMemberRole(workspaceId, auth.value.userId);
  if (!role) {
    // 404 (não 403) para não revelar a existência do workspace a não-membros
    return left({ status: 404, code: "not_found", message: "Workspace não encontrado." });
  }
  if (!roleAtLeast(role, minRole)) {
    return left({ status: 403, code: "forbidden", message: "Papel sem permissão para esta ação." });
  }
  return right({ userId: auth.value.userId, workspaceId, role });
}
