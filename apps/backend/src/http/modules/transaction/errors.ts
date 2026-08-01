import type { AttachmentError } from '../../../application/use-cases/attachment';
import type { TransactionError } from '../../../application/use-cases/transaction';
import type { HttpError } from '../../http-error';

export const TRANSACTION_ERRORS: Record<TransactionError, HttpError> = {
  category_not_found: {
    status: 404,
    code: 'category_not_found',
    message: 'Categoria não encontrada.',
  },
  account_not_found: {
    status: 404,
    code: 'account_not_found',
    message: 'Conta não encontrada.',
  },
  card_not_found: {
    status: 404,
    code: 'card_not_found',
    message: 'Cartão não encontrado.',
  },
  transaction_not_found: {
    status: 404,
    code: 'transaction_not_found',
    message: 'Transação não encontrada.',
  },
  invalid_method_fields: {
    status: 400,
    code: 'invalid_method_fields',
    message: 'Campos incompatíveis com o método (conta/cartão/destino).',
  },
  invoice_paid: {
    status: 409,
    code: 'invoice_paid',
    message: 'Fatura paga é imutável — faça um estorno.',
  },
  installment_field_locked: {
    status: 409,
    code: 'installment_field_locked',
    message: 'Valor e data de parcela são travados; edite descrição/categoria.',
  },
  not_installment_purchase: {
    status: 400,
    code: 'not_installment_purchase',
    message: 'Essa transação não é uma compra parcelada.',
  },
  total_below_paid_amount: {
    status: 409,
    code: 'total_below_paid_amount',
    message:
      'O novo valor total é menor do que o já pago nas parcelas anteriores.',
  },
};

export const ATTACHMENT_ERRORS: Record<AttachmentError, HttpError> = {
  transaction_not_found: {
    status: 404,
    code: 'transaction_not_found',
    message: 'Transação não encontrada.',
  },
  invalid_file_type: {
    status: 400,
    code: 'invalid_file_type',
    message: 'Tipo de arquivo não aceito — envie jpg, png ou webp.',
  },
  file_too_large: {
    status: 400,
    code: 'file_too_large',
    message: 'Arquivo muito grande — o limite é 5MB.',
  },
  attachment_not_found: {
    status: 404,
    code: 'attachment_not_found',
    message: 'Essa transação não tem comprovante anexado.',
  },
};
