import type { SavedFormulaError } from '../../../application/use-cases/saved-formula';
import type { HttpError } from '../../http-error';

export const SAVED_FORMULA_ERRORS: Record<SavedFormulaError, HttpError> = {
  formula_not_found: {
    status: 404,
    code: 'formula_not_found',
    message: 'Fórmula não encontrada.',
  },
  plan_limit_reached: {
    status: 409,
    code: 'plan_limit_reached',
    message: 'Limite de fórmulas salvas do plano atingido.',
  },
  invalid_expression: {
    status: 400,
    code: 'invalid_expression',
    message: 'Expressão inválida.',
  },
  unknown_variable: {
    status: 400,
    code: 'unknown_variable',
    message: 'Fórmula usa uma variável desconhecida.',
  },
  evaluation_error: {
    status: 400,
    code: 'evaluation_error',
    message: 'Não foi possível calcular a fórmula (ex.: divisão por zero).',
  },
};
