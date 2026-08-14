import { Elysia } from 'elysia';
import { getClientIp } from '../../../client-ip';
import type { AppDeps } from '../../../deps';
import { changePasswordRoute } from './change-password';
import { confirmAccountDeletionRoute } from './confirm-account-deletion';
import { confirmEmailChangeRoute } from './confirm-email-change';
import { forgotPasswordRoute } from './forgot-password';
import { googleSignInRoute } from './google-sign-in';
import { linkGoogleRoute } from './link-google';
import { loginRoute } from './login';
import { logoutRoute } from './logout';
import { meRoute } from './me';
import { refreshRoute } from './refresh';
import { registerRoute } from './register';
import { removeAvatarRoute } from './remove-avatar';
import { requestAccountDeletionRoute } from './request-account-deletion';
import { requestEmailChangeRoute } from './request-email-change';
import { resetPasswordRoute } from './reset-password';
import { unlinkGoogleRoute } from './unlink-google';
import { updateNameRoute } from './update-name';
import { uploadAvatarRoute } from './upload-avatar';
import { verifyEmailRoute } from './verify-email';
import { verifyResetCodeRoute } from './verify-reset-code';

/**
 * Limites por IP e por rota (spec: Rate limiting, camada 1) — janela em ms varia por rota.
 * Chave inclui o método porque GET/DELETE /auth/me compartilham o mesmo path
 * (auditoria 2026-07-19: sem isso, o limite da exclusão de conta vazaria pro
 * fetch de perfil, ou vice-versa).
 */
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  'POST /auth/register': { max: 5, windowMs: 3_600_000 },
  'POST /auth/login': { max: 10, windowMs: 60_000 },
  'POST /auth/google': { max: 10, windowMs: 60_000 },
  'POST /auth/refresh': { max: 30, windowMs: 60_000 },
  'POST /auth/forgot-password': { max: 5, windowMs: 3_600_000 },
  'POST /auth/verify-reset-code': { max: 10, windowMs: 60_000 },
  'POST /auth/reset-password': { max: 10, windowMs: 60_000 },
  'POST /auth/verify-email': { max: 10, windowMs: 60_000 },
  'PATCH /auth/me': { max: 10, windowMs: 3_600_000 },
  'POST /auth/me/email/request-change': { max: 5, windowMs: 3_600_000 },
  'POST /auth/me/email/confirm-change': { max: 10, windowMs: 15 * 60_000 },
  'POST /auth/me/password': { max: 5, windowMs: 3_600_000 },
  'POST /auth/me/delete/request': { max: 5, windowMs: 3_600_000 },
  'POST /auth/me/delete/confirm': { max: 10, windowMs: 15 * 60_000 },
  'POST /auth/me/google/link': { max: 10, windowMs: 60_000 },
  'POST /auth/me/google/unlink': { max: 10, windowMs: 60_000 },
  'POST /auth/me/avatar': { max: 10, windowMs: 3_600_000 },
  'DELETE /auth/me/avatar': { max: 10, windowMs: 3_600_000 },
};

export function authRoutes(deps: AppDeps) {
  return new Elysia({ prefix: '/auth' })
    .onBeforeHandle(async ({ request, set, server }) => {
      const path = new URL(request.url).pathname;
      const key = `${request.method} ${path}`;
      const limit = RATE_LIMITS[key];
      if (!limit) return;
      const ip = getClientIp(request, server, deps.trustProxy);
      if (
        await deps.rateLimiter.isLimited(
          `ip:${ip}:${key}`,
          limit.max,
          limit.windowMs
        )
      ) {
        deps.logger.log('rate_limited', { scopeKey: 'ip', path: key });
        set.status = 429;
        set.headers['retry-after'] = String(Math.ceil(limit.windowMs / 1000));
        return {
          error: {
            code: 'rate_limited',
            message: 'Muitas tentativas. Aguarde.',
          },
        };
      }
    })
    .use(registerRoute(deps))
    .use(loginRoute(deps))
    .use(googleSignInRoute(deps))
    .use(refreshRoute(deps))
    .use(logoutRoute(deps))
    .use(forgotPasswordRoute(deps))
    .use(verifyResetCodeRoute(deps))
    .use(resetPasswordRoute(deps))
    .use(verifyEmailRoute(deps))
    .use(meRoute(deps))
    .use(requestAccountDeletionRoute(deps))
    .use(confirmAccountDeletionRoute(deps))
    .use(updateNameRoute(deps))
    .use(requestEmailChangeRoute(deps))
    .use(confirmEmailChangeRoute(deps))
    .use(changePasswordRoute(deps))
    .use(linkGoogleRoute(deps))
    .use(unlinkGoogleRoute(deps))
    .use(uploadAvatarRoute(deps))
    .use(removeAvatarRoute(deps));
}
