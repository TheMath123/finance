import { apiRequest } from "@/lib/api-client";
import type { LoginInput, RegisterInput } from "@/lib/schemas/auth";

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
};
