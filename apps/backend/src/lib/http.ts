import type { ZodType } from "zod";
import type { Db } from "@finance/db";
import type { WorkspaceRole } from "@finance/shared";
import { left, right, type Either } from "@finance/shared";
import { verifyAccessToken } from "./tokens";
import { getMembership, roleAtLeast } from "./authz";

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

export function parse<T>(
  schema: ZodType<T>,
  body: unknown,
): Either<HttpError, T> {
  const result = schema.safeParse(body);
  if (result.success) return right(result.data);
  return left({
    status: 400,
    code: "validation_error",
    message: "Payload inválido.",
    issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

export interface Actor {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

/**
 * Autentica o Bearer token e valida membership + papel mínimo no workspace.
 * Chamado no início de cada handler de rota de domínio (spec: autorização por workspace).
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
