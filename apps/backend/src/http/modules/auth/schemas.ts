import { passwordValidator } from '@finance/shared';
import { z } from 'zod';

/** Toda senha NOVA (cadastro, reset, troca) passa por aqui — maiúscula +
 *  minúscula + número + caractere especial, mesma política em toda a borda
 *  da API, não só no client. */
const newPasswordSchema = passwordValidator({ force: 'strong' }).max(128);
/** Senha EXISTENTE (login, reconfirmação) — só presença/tamanho, sem exigir
 *  complexidade de algo que já foi criado sob a política vigente na época. */
const existingPasswordSchema = passwordValidator({ force: 'weak' });

/** Payloads do auth validados com Zod (spec: Validação). */
export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().toLowerCase(),
  password: newPasswordSchema,
  termsAccepted: z.literal(true, { error: 'aceite dos termos é obrigatório' }),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: existingPasswordSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Login social com Google — `idToken` é o credential do Google Identity Services (web) ou de expo-auth-session (mobile, Fase 2). */
export const googleSignInSchema = z.object({
  idToken: z.string().min(1),
  termsAccepted: z.literal(true, { error: 'aceite dos termos é obrigatório' }),
});

/** Vínculo de conta Google pelo perfil (M5-07) — sem `termsAccepted`, os termos já foram aceitos no cadastro original. */
export const linkGoogleSchema = z.object({
  idToken: z.string().min(1),
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
  password: newPasswordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const requestAccountDeletionSchema = z.object({
  password: existingPasswordSchema,
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
  currentPassword: existingPasswordSchema,
});

export const confirmEmailChangeSchema = z.object({
  code: resetCodeSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: existingPasswordSchema,
  newPassword: newPasswordSchema,
  /** Se enviado, só esta sessão sobrevive à revogação (ver change-password.ts). */
  currentRefreshToken: z.string().min(1).optional(),
});
