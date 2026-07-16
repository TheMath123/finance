import { apiRequest } from "@/lib/api-client";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
  VerifyResetCodeInput,
} from "@/lib/schemas/auth";

export interface AuthSession {
  user: { id: string; name: string; email: string };
  defaultWorkspaceId: string;
  accessToken: string;
  refreshToken: string;
}

export interface MeOutput {
  user: AuthSession["user"];
  defaultWorkspaceId: string;
}

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthSession>("/auth/login", { method: "POST", body: input, skipAuth: true }),

  register: (input: RegisterInput) =>
    apiRequest<AuthSession>("/auth/register", { method: "POST", body: input, skipAuth: true }),

  logout: (refreshToken: string) =>
    apiRequest<void>("/auth/logout", { method: "POST", body: { refreshToken } }),

  me: () => apiRequest<MeOutput>("/auth/me"),

  forgotPassword: (input: ForgotPasswordInput) =>
    apiRequest<{ message: string }>("/auth/forgot-password", { method: "POST", body: input, skipAuth: true }),

  verifyResetCode: (input: VerifyResetCodeInput) =>
    apiRequest<{ message: string }>("/auth/verify-reset-code", { method: "POST", body: input, skipAuth: true }),

  resetPassword: (input: ResetPasswordInput) =>
    apiRequest<{ message: string }>("/auth/reset-password", { method: "POST", body: input, skipAuth: true }),

  verifyEmail: (input: VerifyEmailInput) =>
    apiRequest<{ message: string }>("/auth/verify-email", { method: "POST", body: input, skipAuth: true }),

  deleteAccount: (password: string) =>
    apiRequest<void>("/auth/me", { method: "DELETE", body: { password } }),
};
