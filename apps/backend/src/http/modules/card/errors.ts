import type { CardError } from "../../../application/use-cases/card";
import type { HttpError } from "../../http-error";

export const CARD_ERRORS: Record<CardError, HttpError> = {
  invalid_bank_code: {
    status: 400,
    code: "invalid_bank_code",
    message: "Código de banco fora do catálogo.",
  },
  card_not_found: { status: 404, code: "card_not_found", message: "Cartão não encontrado." },
  card_has_transactions: {
    status: 409,
    code: "card_has_transactions",
    message: "Cartão com transações não pode ser excluído — arquive.",
  },
  invoice_not_found: { status: 404, code: "invoice_not_found", message: "Fatura não encontrada." },
  invoice_already_paid: {
    status: 409,
    code: "invoice_already_paid",
    message: "Fatura já está paga.",
  },
  invoice_empty: { status: 409, code: "invoice_empty", message: "Fatura sem valor a pagar." },
  account_not_found: { status: 404, code: "account_not_found", message: "Conta não encontrada." },
};
