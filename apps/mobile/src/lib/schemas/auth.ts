import { passwordValidator } from '@finance/shared';
import { z } from 'zod';

/**
 * Espelha os schemas de apps/backend/src/http/modules/auth/schemas.ts —
 * mesmo `passwordValidator` de @finance/shared usado lá e no dashboard:
 * `weak` pra senha já existente (login, reconfirmação, senha atual antes de
 * trocar), `strong` pra senha nova (cadastro, reset, troca) — maiúscula +
 * minúscula + número + caractere especial.
 */
const strongPasswordSchema = passwordValidator({ force: 'strong' }).max(128);
const weakPasswordSchema = passwordValidator({ force: 'weak' });

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: weakPasswordSchema,
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Informe seu nome').max(120),
  email: z.string().email('E-mail inválido'),
  password: strongPasswordSchema,
  termsAccepted: z
    .boolean()
    .refine((v) => v, { message: 'aceite dos termos é obrigatório' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

const resetCodeSchema = z
  .string()
  .length(6, 'O código tem 6 dígitos')
  .regex(/^\d{6}$/, 'O código só tem números');

export const verifyResetCodeSchema = z.object({
  email: z.string().email('E-mail inválido'),
  code: resetCodeSchema,
});

export const resetPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
  code: resetCodeSchema,
  password: strongPasswordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Informe o código recebido por e-mail'),
});

export const newPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

/** Edição de perfil (usuário já logado). */
export const updateNameSchema = z.object({
  name: z.string().min(1, 'Informe seu nome').max(120),
});

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('E-mail inválido'),
  currentPassword: weakPasswordSchema,
});

export const confirmEmailChangeSchema = z.object({
  code: resetCodeSchema,
});

export const requestAccountDeletionSchema = z.object({
  password: weakPasswordSchema,
});

export const confirmAccountDeletionSchema = z.object({
  code: resetCodeSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: weakPasswordSchema,
    newPassword: strongPasswordSchema,
    confirmNewPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmNewPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type UpdateNameInput = z.infer<typeof updateNameSchema>;
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RequestAccountDeletionInput = z.infer<
  typeof requestAccountDeletionSchema
>;
export type ConfirmAccountDeletionInput = z.infer<
  typeof confirmAccountDeletionSchema
>;
