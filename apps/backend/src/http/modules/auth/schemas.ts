import { z } from "zod";

/** Payloads do auth validados com Zod (spec: Validação). */
export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  termsAccepted: z.literal(true, { error: "aceite dos termos é obrigatório" }),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const resetCodeSchema = z
  .string()
  .length(6, "Código deve ter 6 dígitos")
  .regex(/^\d{6}$/, "Código deve conter apenas números");

export const verifyResetCodeSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: resetCodeSchema,
});

export const resetPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: resetCodeSchema,
  password: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});
