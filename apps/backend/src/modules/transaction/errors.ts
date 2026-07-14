import type { HttpError } from "../../lib/http";

export type TransactionError =
  | "category_not_found"
  | "account_not_found"
  | "card_not_found"
  | "transaction_not_found"
  | "invalid_method_fields"
  | "invoice_paid"
  | "installment_field_locked";

export const TRANSACTION_ERRORS: Record<TransactionError, HttpError> = {
  category_not_found: {
    status: 404,
    code: "category_not_found",
    message: "Categoria não encontrada.",
  },
  account_not_found: { status: 404, code: "account_not_found", message: "Conta não encontrada." },
  card_not_found: { status: 404, code: "card_not_found", message: "Cartão não encontrado." },
  transaction_not_found: {
    status: 404,
    code: "transaction_not_found",
    message: "Transação não encontrada.",
  },
  invalid_method_fields: {
    status: 400,
    code: "invalid_method_fields",
    message: "Campos incompatíveis com o método (conta/cartão/destino).",
  },
  invoice_paid: {
    status: 409,
    code: "invoice_paid",
    message: "Fatura paga é imutável — faça um estorno.",
  },
  installment_field_locked: {
    status: 409,
    code: "installment_field_locked",
    message: "Valor e data de parcela são travados; edite descrição/categoria.",
  },
};
