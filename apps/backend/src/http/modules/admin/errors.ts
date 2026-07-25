import type { AdminError } from '../../../application/use-cases/admin';
import type { HttpError } from '../../http-error';

export const ADMIN_ERRORS: Record<AdminError, HttpError> = {
  user_not_found: {
    status: 404,
    code: 'user_not_found',
    message: 'Usuário não encontrado.',
  },
  default_category_not_found: {
    status: 404,
    code: 'default_category_not_found',
    message: 'Categoria padrão não encontrada.',
  },
  cannot_suspend_self: {
    status: 409,
    code: 'cannot_suspend_self',
    message: 'Você não pode suspender sua própria conta.',
  },
  cannot_delete_fallback_category: {
    status: 409,
    code: 'cannot_delete_fallback_category',
    message:
      'Não é possível excluir a categoria fallback — marque outra como fallback antes.',
  },
};
