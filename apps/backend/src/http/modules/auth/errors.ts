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
  account_suspended: {
    status: 403,
    code: 'account_suspended',
    message: 'Sua conta foi suspensa. Entre em contato com o suporte.',
  },
  google_token_invalid: {
    status: 401,
    code: 'google_token_invalid',
    message: 'Não foi possível confirmar sua conta Google. Tente novamente.',
  },
  google_email_unverified: {
    status: 401,
    code: 'google_email_unverified',
    message:
      'Seu e-mail do Google ainda não foi verificado pela própria Google.',
  },
  google_email_registered: {
    status: 409,
    code: 'google_email_registered',
    message:
      'Este e-mail já tem uma conta com senha. Entre com sua senha ou clique em "Esqueci minha senha".',
  },
  google_link_email_mismatch: {
    status: 409,
    code: 'google_link_email_mismatch',
    message: 'O e-mail da conta Google precisa ser o mesmo da sua conta.',
  },
  google_account_linked_elsewhere: {
    status: 409,
    code: 'google_account_linked_elsewhere',
    message: 'Essa conta Google já está vinculada a outro usuário.',
  },
  google_already_linked: {
    status: 409,
    code: 'google_already_linked',
    message:
      'Você já tem uma conta Google vinculada. Desvincule antes de vincular outra.',
  },
  google_not_linked: {
    status: 409,
    code: 'google_not_linked',
    message: 'Você não tem nenhuma conta Google vinculada.',
  },
  invalid_file_type: {
    status: 400,
    code: 'invalid_file_type',
    message: 'Tipo de arquivo não aceito — envie jpg, png ou webp.',
  },
  file_too_large: {
    status: 400,
    code: 'file_too_large',
    message: 'Arquivo muito grande — limite de 2MB.',
  },
  avatar_not_found: {
    status: 404,
    code: 'avatar_not_found',
    message: 'Você não tem nenhum avatar personalizado pra remover.',
  },
};
