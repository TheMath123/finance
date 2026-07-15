import { apiRequest } from "@/lib/api-client";
import type { LoginInput, RegisterInput } from "@/lib/schemas/auth";

export interface AuthSession {
  user: { id: string; name: string; email: string };
  defaultWorkspaceId: string;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthSession>("/login", { method: "POST", body: input, skipAuth: true }),

  register: (input: RegisterInput) =>
    apiRequest<AuthSession>("/register", { method: "POST", body: input, skipAuth: true }),

  logout: (refreshToken: string) =>
    apiRequest<void>("/logout", { method: "POST", body: { refreshToken } }),
};
