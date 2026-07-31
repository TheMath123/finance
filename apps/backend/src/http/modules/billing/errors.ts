import type { BillingError } from '../../../application/use-cases/billing/errors';
import type { HttpError } from '../../http-error';

export const BILLING_ERRORS: Record<BillingError, HttpError> = {
  plan_not_found: {
    status: 404,
    code: 'plan_not_found',
    message: 'Plano não encontrado.',
  },
  plan_price_not_found: {
    status: 404,
    code: 'plan_price_not_found',
    message: 'Opção de cobrança não encontrada.',
  },
  no_active_subscription: {
    status: 404,
    code: 'no_active_subscription',
    message: 'Este workspace ainda não tem assinatura ativa.',
  },
};
