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
  /** Plano do workspace pessoal (`defaultWorkspaceId`) — null se o usuário ainda não tiver um (não deveria acontecer pós-registro). */
  planName: string | null;
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

  const plans = await deps.repos.plan.list();
  const plansById = new Map(plans.map((p) => [p.id, p]));
  const workspaces = await Promise.all(
    users.map((u) =>
      u.defaultWorkspaceId
        ? deps.repos.workspace.findById(u.defaultWorkspaceId)
        : undefined
    )
  );

  return {
    users: users.map((u, i) => ({
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
      planName: plansById.get(workspaces[i]?.planId ?? '')?.name ?? null,
    })),
    total,
  };
}
