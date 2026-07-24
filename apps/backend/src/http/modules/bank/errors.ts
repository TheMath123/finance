import type { BankError } from '../../../application/use-cases/bank';
import type { HttpError } from '../../http-error';

export const BANK_ERRORS: Record<BankError, HttpError> = {
  bank_not_found: {
    status: 404,
    code: 'bank_not_found',
    message: 'Banco não encontrado.',
  },
  invalid_bank_code: {
    status: 400,
    code: 'invalid_bank_code',
    message: 'Código de banco fora do catálogo.',
  },
  bank_in_use: {
    status: 409,
    code: 'bank_in_use',
    message: 'Banco com contas/cartões não pode ser excluído — arquive.',
  },
};
