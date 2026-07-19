import type { SplitError } from "../../../application/use-cases/split";
import type { HttpError } from "../../http-error";

export const SPLIT_ERRORS: Record<SplitError, HttpError> = {
  rate_limited: {
    status: 429,
    code: "rate_limited",
    message: "Muitas tentativas em pouco tempo. Aguarde um instante.",
  },
  transaction_not_found: { status: 404, code: "transaction_not_found", message: "Transação não encontrada." },
  not_an_expense: { status: 400, code: "not_an_expense", message: "Só é possível dividir uma despesa." },
  unsupported_method: {
    status: 400,
    code: "unsupported_method",
    message: "Essa transação não pode ser dividida (precisa ter uma conta de origem).",
  },
  already_split: { status: 409, code: "already_split", message: "Essa transação já tem um split ativo." },
  no_participants: { status: 400, code: "no_participants", message: "Informe ao menos um participante." },
  participant_not_found: {
    status: 404,
    code: "participant_not_found",
    message: "Participante não encontrado.",
  },
  self_participant: {
    status: 400,
    code: "self_participant",
    message: "Você não pode se adicionar como participante.",
  },
  invalid_amount: { status: 400, code: "invalid_amount", message: "Valor inválido pra um dos participantes." },
  amounts_exceed_total: {
    status: 400,
    code: "amounts_exceed_total",
    message: "A soma das partes não pode passar do valor total da transação.",
  },
  split_not_found: { status: 404, code: "not_found", message: "Split não encontrado." },
  not_creator: {
    // Mesmo código/mensagem de "não encontrado" — não revela que o split existe pra quem não é o criador.
    status: 404,
    code: "not_found",
    message: "Split não encontrado.",
  },
  shares_already_settled: {
    status: 409,
    code: "shares_already_settled",
    message: "Não é possível cancelar: alguma parte já foi paga ou confirmada.",
  },
  share_not_found: { status: 404, code: "not_found", message: "Parte do split não encontrada." },
  not_participant: {
    status: 404,
    code: "not_found",
    message: "Parte do split não encontrada.",
  },
  invalid_transition: {
    status: 409,
    code: "invalid_transition",
    message: "Essa ação não é válida no estado atual dessa parte.",
  },
};
