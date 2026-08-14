import type { PlatformRole } from '@finance/shared';

/** Entidade pura — sem dependência de infra (as rows do Drizzle a satisfazem estruturalmente). */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  pendingEmail: string | null;
  termsAcceptedAt: Date;
  termsVersion: string;
  platformRole: PlatformRole;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  suspendedAt: Date | null;
  /** URL externa do avatar (hoje só a `picture` do Google) — ver `resolveAvatarUrl`. */
  avatarUrl: string | null;
  /** Chave no storage de um avatar enviado manualmente — tem prioridade sobre `avatarUrl`. */
  avatarKey: string | null;
  defaultWorkspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
