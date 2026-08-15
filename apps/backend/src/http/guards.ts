import type { WorkspaceRole } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import type { Actor } from '../application/deps';
import { roleAtLeast } from '../domain/services/authorization';
import {
  isMembershipOverQuota,
  isWorkspaceOverQuota,
} from '../domain/services/plan-enforcement';
import type { AppDeps } from './deps';
import type { HttpError } from './http-error';

/** Limite geral por usuário autenticado (camada 3 do plano de rate limiting). */
const USER_RATE_MAX = 300;
const USER_RATE_WINDOW_MS = 60_000;

/** Autentica o Bearer token (usuário logado, sem exigir papel em workspace). */
export async function requireAuthenticated(
  deps: Pick<AppDeps, 'tokens'>,
  request: Request
): Promise<Either<HttpError, { userId: string }>> {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? await deps.tokens.verifyAccess(token) : null;
  if (!payload) {
    return left({
      status: 401,
      code: 'unauthorized',
      message: 'Autenticação necessária.',
    });
  }
  return right(payload);
}

/**
 * Autentica, aplica o limite por usuário e valida membership + papel mínimo no
 * workspace (spec: autorização por workspace).
 *
 * Downgrade enforcement (workspace ou membro acima da quota do plano
 * efetivo, ver `domain/services/plan-enforcement.ts`): rebaixa o papel
 * efetivo pra `viewer` — nunca apaga nada, só bloqueia escrita (rotas de
 * leitura pedem `minRole: 'viewer'`, então continuam liberadas). O `owner`
 * nunca é rebaixado por essa checagem: precisa manter acesso total pra
 * resolver a situação (upgrade em algum workspace ou apagar até caber).
 */
export async function requireWorkspaceRole(
  deps: Pick<AppDeps, 'tokens' | 'repos' | 'rateLimiter' | 'logger'>,
  request: Request,
  workspaceId: string,
  minRole: WorkspaceRole
): Promise<Either<HttpError, Actor>> {
  const auth = await requireAuthenticated(deps, request);
  if (!auth.ok) return auth;

  if (
    await deps.rateLimiter.isLimited(
      `user:${auth.value.userId}`,
      USER_RATE_MAX,
      USER_RATE_WINDOW_MS
    )
  ) {
    deps.logger.log('rate_limited', {
      scopeKey: 'user',
      userId: auth.value.userId,
    });
    return left({
      status: 429,
      code: 'rate_limited',
      message: 'Muitas requisições. Aguarde um instante.',
    });
  }

  const role = await deps.repos.workspace.getMemberRole(
    workspaceId,
    auth.value.userId
  );
  if (!role) {
    // 404 (não 403) para não revelar a existência do workspace a não-membros
    return left({
      status: 404,
      code: 'not_found',
      message: 'Workspace não encontrado.',
    });
  }

  let effectiveRole = role;
  if (role !== 'owner') {
    const workspace = await deps.repos.workspace.findById(workspaceId);
    if (workspace) {
      const overQuota =
        (await isWorkspaceOverQuota(deps, workspace)) ||
        (await isMembershipOverQuota(deps, workspace, auth.value.userId));
      if (overQuota) effectiveRole = 'viewer';
    }
  }

  if (!roleAtLeast(effectiveRole, minRole)) {
    return left({
      status: 403,
      code: 'forbidden',
      message:
        effectiveRole !== role
          ? 'Workspace acima do limite do plano — só leitura até resolver (upgrade ou remover workspace/membro até caber no limite).'
          : 'Papel sem permissão para esta ação.',
    });
  }
  return right({ userId: auth.value.userId, workspaceId, role: effectiveRole });
}

/**
 * Autentica e exige `platformRole === "superadmin"` (área administrativa, M4-07).
 * Sem membership de workspace envolvida — superadmin administra a plataforma,
 * nunca os dados financeiros dos usuários (spec, LGPD).
 */
export async function requireSuperadmin(
  deps: Pick<AppDeps, 'tokens' | 'repos' | 'rateLimiter' | 'logger'>,
  request: Request
): Promise<Either<HttpError, { userId: string }>> {
  const auth = await requireAuthenticated(deps, request);
  if (!auth.ok) return auth;

  if (
    await deps.rateLimiter.isLimited(
      `admin:${auth.value.userId}`,
      USER_RATE_MAX,
      USER_RATE_WINDOW_MS
    )
  ) {
    deps.logger.log('rate_limited', {
      scopeKey: 'admin',
      userId: auth.value.userId,
    });
    return left({
      status: 429,
      code: 'rate_limited',
      message: 'Muitas requisições. Aguarde um instante.',
    });
  }

  const user = await deps.repos.user.findById(auth.value.userId);
  if (!user || user.platformRole !== 'superadmin') {
    return left({
      status: 403,
      code: 'forbidden',
      message: 'Acesso restrito a administradores da plataforma.',
    });
  }
  return right({ userId: auth.value.userId });
}
