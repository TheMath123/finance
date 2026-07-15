import type { RecurringError } from "../../../application/use-cases/recurring";
import { TRANSACTION_ERRORS } from "../transaction/errors";
import type { HttpError } from "../../http-error";

export const RECURRING_ERRORS: Record<RecurringError, HttpError> = {
  ...TRANSACTION_ERRORS,
  recurring_not_found: {
    status: 404,
    code: "recurring_not_found",
    message: "Recorrência não encontrada.",
  },
  invalid_rule: {
    status: 400,
    code: "invalid_rule",
    message: "Regra de recorrência inválida (dia/mês incompatíveis com a frequência).",
  },
  occurrence_already_confirmed: {
    status: 409,
    code: "occurrence_already_confirmed",
    message: "Esta ocorrência já foi lançada.",
  },
  not_an_occurrence: {
    status: 400,
    code: "not_an_occurrence",
    message: "A data não é uma ocorrência desta recorrência.",
  },
};
