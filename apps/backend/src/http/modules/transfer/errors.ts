import type { TransferError } from "../../../application/use-cases/transfer";
import type { HttpError } from "../../http-error";

export const TRANSFER_ERRORS: Record<TransferError, HttpError> = {
  rate_limited: {
    status: 429,
    code: "rate_limited",
    message: "Muitas transferências em pouco tempo. Aguarde um instante.",
  },
  invalid_amount: {
    status: 400,
    code: "invalid_amount",
    message: "Valor inválido.",
  },
  recipient_not_found: {
    status: 404,
    code: "recipient_not_found",
    message: "Nenhum usuário encontrado com esse telefone/e-mail.",
  },
  self_transfer: {
    status: 400,
    code: "self_transfer",
    message: "Você não pode transferir para si mesmo.",
  },
  account_not_found: {
    status: 404,
    code: "account_not_found",
    message: "Conta não encontrada.",
  },
  transfer_not_found: {
    status: 404,
    code: "not_found",
    message: "Transferência não encontrada.",
  },
  not_recipient: {
    // Mesmo código/mensagem de "não encontrada" — não revela que a transferência existe pra outra pessoa.
    status: 404,
    code: "not_found",
    message: "Transferência não encontrada.",
  },
  already_finalized: {
    status: 409,
    code: "already_finalized",
    message: "Essa transferência já foi aceita, recusada ou expirou.",
  },
  trusted_contact_not_found: {
    status: 404,
    code: "trusted_contact_not_found",
    message: "Contato confiável não encontrado.",
  },
};
