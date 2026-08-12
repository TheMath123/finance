import type { AccountError } from '../../../application/use-cases/account';
import type { HttpError } from '../../http-error';

export const ACCOUNT_ERRORS: Record<AccountError, HttpError> = {
  invalid_bank_code: {
    status: 400,
    code: 'invalid_bank_code',
    message: 'Código de banco fora do catálogo.',
  },
  account_not_found: {
    status: 404,
    code: 'account_not_found',
    message: 'Conta não encontrada.',
  },
  account_has_transactions: {
    status: 409,
    code: 'account_has_transactions',
    message: 'Conta com transações não pode ser excluída — arquive.',
  },
  csv_empty: {
    status: 400,
    code: 'csv_empty',
    message: 'Arquivo CSV vazio ou sem linhas de dado.',
  },
  file_too_large: {
    status: 413,
    code: 'file_too_large',
    message: 'Arquivo maior que o limite permitido (2MB).',
  },
  category_not_found: {
    status: 404,
    code: 'category_not_found',
    message: 'Categoria não encontrada.',
  },
};
