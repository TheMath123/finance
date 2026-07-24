import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

export interface ConfirmEmailChangeInput {
  /** Sempre o ator autenticado (guard extrai do JWT) — nunca um alvo vindo do cliente. */
  userId: string;
  code: string;
}

/**
 * Passo 2 da troca de e-mail: consome o código enviado ao e-mail novo, aplica a
 * troca de vez (limpa `pendingEmail`, marca `emailVerifiedAt`) e avisa o e-mail
 * ANTIGO (segurança — se não foi o dono, ele fica sabendo).
 */
export async function confirmEmailChange(
  deps: UseCaseDeps,
  input: ConfirmEmailChangeInput
): Promise<Either<AuthError, { email: string }>> {
  // Espaço pequeno (6 dígitos) — mesmo limite de tentativas do reset de senha.
  if (
    await deps.rateLimiter.isLimited(
      `email-change-confirm:${input.userId}`,
      5,
      15 * 60_000
    )
  ) {
    return left('rate_limited');
  }

  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left('invalid_token');
  if (!user.pendingEmail) return left('no_pending_email_change');

  const stored = await deps.repos.token.findValidAuthTokenForUser(
    user.id,
    'email_change',
    deps.tokens.hashOpaque(input.code)
  );
  if (!stored) return left('invalid_code');

  // Corrida: outra conta pode ter registrado esse e-mail entre o pedido e a confirmação.
  const conflicting = await deps.repos.user.findByEmail(user.pendingEmail);
  if (conflicting && conflicting.id !== user.id)
    return left('email_already_in_use');

  const oldEmail = user.email;
  const newEmail = user.pendingEmail;

  await deps.uow.run(async (repos) => {
    await repos.user.applyEmailChange(user.id, newEmail);
    await repos.token.markAuthTokenUsed(stored.id);
  });

  await deps.dispatch('email.email-changed', {
    to: oldEmail,
    name: user.name,
    newEmail,
  });

  return right({ email: newEmail });
}
