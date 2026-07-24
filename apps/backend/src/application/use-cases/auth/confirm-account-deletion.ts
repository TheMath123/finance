import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

export interface ConfirmAccountDeletionInput {
  /** Sempre o ator autenticado (guard extrai do JWT) — nunca um alvo vindo do cliente. */
  userId: string;
  code: string;
}

/**
 * Passo 2 da exclusão de conta (LGPD): consome o código de 6 dígitos enviado
 * ao próprio e-mail cadastrado (ver `request-account-deletion.ts`) e só então
 * apaga a conta de vez.
 *
 * Regra (spec > Workspaces e compartilhamento > LGPD e exclusão): workspaces em
 * que o usuário é o ÚNICO owner são excluídos por completo (inclui sempre o
 * pessoal, e também qualquer family em que ele acabou sendo o único dono); em
 * workspaces compartilhados que continuam existindo (têm outro owner), só a
 * membership dele some — `created_by`/`audit_logs.user_id`/
 * `workspace_invites.invited_by` são anonimizados via `onDelete: "set null"`
 * no schema, não precisa de código aqui.
 *
 * Ordem importa: `users.default_workspace_id` referencia `workspaces.id` sem
 * cascade, então o usuário precisa ser deletado ANTES de qualquer workspace
 * (senão a FK bloqueia a exclusão do pessoal enquanto o usuário ainda aponta
 * pra ele). Deletar o usuário primeiro também já remove a membership dele em
 * TODOS os workspaces (cascade), então `countOwners` depois do delete já
 * reflete só os owners que sobraram.
 */
export async function confirmAccountDeletion(
  deps: UseCaseDeps,
  input: ConfirmAccountDeletionInput
): Promise<Either<AuthError, null>> {
  // Espaço pequeno (6 dígitos) — mesmo limite de tentativas do reset de senha.
  if (
    await deps.rateLimiter.isLimited(
      `account-deletion-confirm:${input.userId}`,
      5,
      15 * 60_000
    )
  ) {
    return left('rate_limited');
  }

  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left('invalid_code');

  const stored = await deps.repos.token.findValidAuthTokenForUser(
    user.id,
    'account_deletion',
    deps.tokens.hashOpaque(input.code)
  );
  if (!stored) return left('invalid_code');

  const memberships = await deps.repos.workspace.listByUser(user.id);
  const ownedWorkspaceIds = memberships
    .filter((m) => m.role === 'owner')
    .map((m) => m.workspace.id);

  await deps.uow.run(async (repos) => {
    await repos.user.delete(user.id);

    for (const workspaceId of ownedWorkspaceIds) {
      const remainingOwners = await repos.workspace.countOwners(workspaceId);
      if (remainingOwners === 0) {
        await repos.workspace.delete(workspaceId);
      }
    }
  });

  return right(null);
}
