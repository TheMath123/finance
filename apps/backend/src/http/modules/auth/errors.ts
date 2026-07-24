import type { AuthError } from '../../../application/use-cases/auth';
import type { HttpError } from '../../http-error';

export const AUTH_ERRORS: Record<AuthError, HttpError> = {
  email_taken: {
    status: 409,
    code: 'email_taken',
    message: 'E-mail já cadastrado.',
  },
  invalid_credentials: {
    status: 401,
    code: 'invalid_credentials',
    message: 'E-mail ou senha inválidos.',
  },
  invalid_token: {
    status: 401,
    code: 'invalid_token',
    message: 'Token inválido ou expirado.',
  },
  invalid_code: {
    status: 401,
    code: 'invalid_code',
    message: 'Código inválido ou expirado.',
  },
  rate_limited: {
    status: 429,
    code: 'rate_limited',
    message: 'Muitas tentativas. Aguarde antes de tentar novamente.',
  },
  email_already_in_use: {
    status: 409,
    code: 'email_already_in_use',
    message: 'Este e-mail já está em uso por outra conta.',
  },
  no_pending_email_change: {
    status: 409,
    code: 'no_pending_email_change',
    message: 'Não há troca de e-mail pendente para confirmar.',
  },
};
