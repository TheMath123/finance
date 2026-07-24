import { Elysia } from 'elysia';
import { forgotPassword } from '../../../../application/use-cases/auth';
import type { AppDeps } from '../../../deps';
import { fail } from '../../../http-error';
import { validateBody } from '../../../validate';
import { forgotPasswordSchema } from '../schemas';

export const forgotPasswordRoute = (deps: AppDeps) =>
  new Elysia().post('/forgot-password', async ({ body, set }) => {
    const input = validateBody(forgotPasswordSchema, body);
    if (!input.ok) return fail(set, input.error);
    await forgotPassword(deps, input.value);
    // Resposta sempre genérica (OWASP): não revela se o e-mail existe
    return {
      message: 'Se o e-mail existir, enviaremos as instruções de recuperação.',
    };
  });
