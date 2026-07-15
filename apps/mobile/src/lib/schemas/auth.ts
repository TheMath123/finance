import { z } from "zod";

/**
 * Espelha os schemas de apps/backend/src/http/modules/auth/schemas.ts.
 * TODO: mover para packages/shared quando o backend expuser schemas de auth
 * reutilizáveis entre app e API (spec: Zod compartilhado "quando fizer sentido").
 */
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Informe seu nome").max(120),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128),
  termsAccepted: z.boolean().refine((v) => v, { message: "aceite dos termos é obrigatório" }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Informe o token recebido por e-mail"),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Informe o token recebido por e-mail"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
