import type { HttpError } from "../../lib/http";

export type AuthError = "email_taken" | "invalid_credentials" | "invalid_token";

export const AUTH_ERRORS: Record<AuthError, HttpError> = {
  email_taken: { status: 409, code: "email_taken", message: "E-mail já cadastrado." },
  invalid_credentials: {
    status: 401,
    code: "invalid_credentials",
    message: "E-mail ou senha inválidos.",
  },
  invalid_token: { status: 401, code: "invalid_token", message: "Token inválido ou expirado." },
};
