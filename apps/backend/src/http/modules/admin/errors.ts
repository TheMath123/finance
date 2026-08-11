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
  plan_key_taken: {
    status: 409,
    code: 'plan_key_taken',
    message: 'Já existe um plano com essa chave.',
  },
  plan_not_found: {
    status: 404,
    code: 'plan_not_found',
    message: 'Plano não encontrado.',
  },
  workspace_not_found: {
    status: 404,
    code: 'workspace_not_found',
    message: 'Workspace não encontrado.',
  },
  unknown_feature_key: {
    status: 422,
    code: 'unknown_feature_key',
    message: 'Uma ou mais features não existem como feature flag cadastrada.',
  },
  plan_price_interval_taken: {
    status: 409,
    code: 'plan_price_interval_taken',
    message: 'Esse plano já tem uma opção de cobrança com esse intervalo.',
  },
  plan_price_not_found: {
    status: 404,
    code: 'plan_price_not_found',
    message: 'Opção de cobrança não encontrada.',
  },
  plan_price_required: {
    status: 409,
    code: 'plan_price_required',
    message: 'O plano precisa ter ao menos uma opção de cobrança.',
  },
  feature_flag_not_found: {
    status: 404,
    code: 'feature_flag_not_found',
    message: 'Feature flag não encontrada.',
  },
  cannot_delete_system_feature_flag: {
    status: 409,
    code: 'cannot_delete_system_feature_flag',
    message: 'Esta feature flag é do sistema e não pode ser excluída.',
  },
};
