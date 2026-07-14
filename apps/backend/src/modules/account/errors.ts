import type { HttpError } from "../../lib/http";

export type AccountError = "bank_not_found" | "account_not_found" | "account_has_transactions";

export const ACCOUNT_ERRORS: Record<AccountError, HttpError> = {
  bank_not_found: { status: 404, code: "bank_not_found", message: "Banco não encontrado." },
  account_not_found: { status: 404, code: "account_not_found", message: "Conta não encontrada." },
  account_has_transactions: {
    status: 409,
    code: "account_has_transactions",
    message: "Conta com transações não pode ser excluída — arquive.",
  },
};
