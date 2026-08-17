import {
  apiRequest,
  apiRequestUpload,
  type UploadFile,
} from '@/lib/api-client';
import type {
  ChangePasswordInput,
  ConfirmAccountDeletionInput,
  ConfirmEmailChangeInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  RequestAccountDeletionInput,
  RequestEmailChangeInput,
  ResetPasswordInput,
  UpdateNameInput,
  VerifyEmailInput,
  VerifyResetCodeInput,
} from '@/lib/schemas/auth';
import { tokenStore } from '@/lib/secure-store';

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerifiedAt: string | null;
    pendingEmail: string | null;
    avatarUrl: string | null;
    /** Conta Google vinculada (login social) — decide "Vincular"/"Desvincular" na tela de perfil. */
    googleLinked: boolean;
  };
  defaultWorkspaceId: string;
  accessToken: string;
  refreshToken: string;
}

export interface MeOutput {
  user: AuthSession['user'];
  defaultWorkspaceId: string;
  /** key → enabled — gateia UI de features experimentais (ex. import de CSV de fatura). */
  featureFlags: Record<string, boolean>;
}

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: input,
      skipAuth: true,
    }),

  register: (input: RegisterInput) =>
    apiRequest<AuthSession>('/auth/register', {
      method: 'POST',
      body: input,
      skipAuth: true,
    }),

  /** Login/cadastro via Google — mesmo endpoint faz as duas coisas: cria a conta na hora se o e-mail do Google ainda não existir. */
  googleSignIn: (idToken: string) =>
    apiRequest<AuthSession>('/auth/google', {
      method: 'POST',
      body: { idToken, termsAccepted: true },
      skipAuth: true,
    }),

  /** Vincula Google à conta logada — exige que o e-mail do Google bata com o e-mail da conta. */
  linkGoogle: (idToken: string) =>
    apiRequest<void>('/auth/me/google/link', {
      method: 'POST',
      body: { idToken },
    }),

  unlinkGoogle: () =>
    apiRequest<void>('/auth/me/google/unlink', { method: 'POST' }),

  logout: (refreshToken: string) =>
    apiRequest<void>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    }),

  me: () => apiRequest<MeOutput>('/auth/me'),

  forgotPassword: (input: ForgotPasswordInput) =>
    apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: input,
      skipAuth: true,
    }),

  verifyResetCode: (input: VerifyResetCodeInput) =>
    apiRequest<{ message: string }>('/auth/verify-reset-code', {
      method: 'POST',
      body: input,
      skipAuth: true,
    }),

  resetPassword: (input: ResetPasswordInput) =>
    apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: input,
      skipAuth: true,
    }),

  verifyEmail: (input: VerifyEmailInput) =>
    apiRequest<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: input,
      skipAuth: true,
    }),

  requestAccountDeletion: (input: RequestAccountDeletionInput) =>
    apiRequest<void>('/auth/me/delete/request', {
      method: 'POST',
      body: input,
    }),

  confirmAccountDeletion: (input: ConfirmAccountDeletionInput) =>
    apiRequest<void>('/auth/me/delete/confirm', {
      method: 'POST',
      body: input,
    }),

  updateName: (input: UpdateNameInput) =>
    apiRequest<{ name: string }>('/auth/me', { method: 'PATCH', body: input }),

  requestEmailChange: (input: RequestEmailChangeInput) =>
    apiRequest<void>('/auth/me/email/request-change', {
      method: 'POST',
      body: input,
    }),

  confirmEmailChange: (input: ConfirmEmailChangeInput) =>
    apiRequest<{ email: string }>('/auth/me/email/confirm-change', {
      method: 'POST',
      body: input,
    }),

  uploadAvatar: (file: UploadFile) =>
    apiRequestUpload<{ avatarKey: string }>('/auth/me/avatar', file),

  removeAvatar: () => apiRequest<void>('/auth/me/avatar', { method: 'DELETE' }),

  /** Anexa o refresh token atual — só ele sobrevive à revogação das sessões (ver change-password.ts no backend). */
  changePassword: async ({
    currentPassword,
    newPassword,
  }: ChangePasswordInput) => {
    const currentRefreshToken =
      (await tokenStore.getRefreshToken()) ?? undefined;
    return apiRequest<void>('/auth/me/password', {
      method: 'POST',
      body: { currentPassword, newPassword, currentRefreshToken },
    });
  },
};
