import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

export interface UnlinkGoogleAccountInput {
  userId: string;
}

/**
 * Desvincula a conta Google do usuário (M5-07) — volta a valer só a senha.
 * Não bloqueia mesmo se o usuário nunca tiver definido senha de verdade
 * (conta criada só via Google, com passwordHash placeholder): o fluxo de
 * "esqueci minha senha" (forgot-password.ts) funciona pra qualquer conta,
 * baseado em posse do e-mail, não na senha antiga — sempre dá pra recuperar
 * o acesso depois de desvincular.
 *
 * Não mexe no avatar — desvincular é sobre método de login, não sobre a
 * foto (fica exatamente como estava, mesmo que tenha vindo do Google).
 */
export async function unlinkGoogleAccount(
  deps: UseCaseDeps,
  input: UnlinkGoogleAccountInput
): Promise<Either<AuthError, void>> {
  const existing = await deps.repos.oauthAccount.findByUserAndProvider(
    input.userId,
    'google'
  );
  if (!existing) return left('google_not_linked');

  await deps.repos.oauthAccount.deleteByUserAndProvider(input.userId, 'google');
  return right(undefined);
}
