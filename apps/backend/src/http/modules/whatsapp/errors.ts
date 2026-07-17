import type { WhatsAppLinkError } from "../../../application/use-cases/whatsapp";
import type { HttpError } from "../../http-error";

export const WHATSAPP_ERRORS: Record<WhatsAppLinkError, HttpError> = {
  rate_limited: {
    status: 429,
    code: "rate_limited",
    message: "Muitas tentativas. Aguarde um instante antes de gerar um novo código.",
  },
  invalid_code: {
    status: 400,
    code: "invalid_code",
    message: "Código inválido ou expirado.",
  },
  phone_already_linked: {
    status: 409,
    code: "phone_already_linked",
    message: "Esse número já está vinculado a outra conta.",
  },
};
