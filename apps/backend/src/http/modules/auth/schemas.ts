import { z } from 'zod';

/** Payloads do auth validados com Zod (spec: Validação). */
export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  termsAccepted: z.literal(true, { error: 'aceite dos termos é obrigatório' }),
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

export const resetCodeSchema = z
  .string()
  .length(6, 'Código deve ter 6 dígitos')
  .regex(/^\d{6}$/, 'Código deve conter apenas números');

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

export const requestAccountDeletionSchema = z.object({
  password: z.string().min(1),
});

export const confirmAccountDeletionSchema = z.object({
  code: resetCodeSchema,
});

/** Edição de perfil (spec: usuário logado edita nome/e-mail/senha). */
export const updateNameSchema = z.object({
  name: z.string().min(1).max(120),
});

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().email().toLowerCase(),
  currentPassword: z.string().min(1),
});

export const confirmEmailChangeSchema = z.object({
  code: resetCodeSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  /** Se enviado, só esta sessão sobrevive à revogação (ver change-password.ts). */
  currentRefreshToken: z.string().min(1).optional(),
});
