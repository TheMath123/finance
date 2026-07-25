import type { PlatformRole } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: PlatformRole;
  emailVerifiedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
}

export interface ListUsersOutput {
  users: AdminUserView[];
  total: number;
}

export interface ListUsersInput {
  search?: string;
  limit: number;
  offset: number;
}

/** Nunca inclui `passwordHash` — mapeamento explícito, mesmo padrão de `me.ts`. */
export async function listUsers(
  deps: Pick<UseCaseDeps, 'repos'>,
  input: ListUsersInput
): Promise<ListUsersOutput> {
  const { users, total } = await deps.repos.user.listAll(input);
  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      platformRole: u.platformRole,
      emailVerifiedAt: u.emailVerifiedAt
        ? u.emailVerifiedAt.toISOString()
        : null,
      suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
  };
}
