import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

export interface LinkGoogleAccountInput {
  userId: string;
  idToken: string;
}

/**
 * Vincula uma conta Google a um usuário já autenticado (por senha ou já
 * logado via Google) — fluxo do perfil (M5-07). Diferente de
 * `google-sign-in.ts`, aqui o usuário já está identificado pelo JWT; o ID
 * token só prova a posse daquela conta Google específica.
 *
 * Exige que o e-mail da conta Google seja o mesmo da conta na plataforma
 * (decisão de produto) — evita vincular um Google de e-mail diferente sem
 * querer.
 */
export async function linkGoogleAccount(
  deps: UseCaseDeps,
  input: LinkGoogleAccountInput
): Promise<Either<AuthError, void>> {
  const identity = await deps.googleIdentity.verifyIdToken(input.idToken);
  if (!identity) return left('google_token_invalid');
  if (!identity.emailVerified) return left('google_email_unverified');

  const user = await deps.repos.user.findById(input.userId);
  if (!user) throw new Error('usuário autenticado não encontrado');

  if (identity.email.toLowerCase() !== user.email.toLowerCase()) {
    return left('google_link_email_mismatch');
  }

  const existingAccount = await deps.repos.oauthAccount.findByProvider(
    'google',
    identity.sub
  );
  if (existingAccount) {
    // Já vinculada a este mesmo usuário — idempotente, não é erro.
    if (existingAccount.userId === user.id) return right(undefined);
    return left('google_account_linked_elsewhere');
  }

  const existingForUser = await deps.repos.oauthAccount.findByUserAndProvider(
    user.id,
    'google'
  );
  if (existingForUser) return left('google_already_linked');

  await deps.repos.oauthAccount.create({
    userId: user.id,
    provider: 'google',
    providerAccountId: identity.sub,
    email: identity.email,
  });

  // Só preenche o avatar se o usuário ainda não tinha nenhum — nunca
  // sobrescreve um upload manual nem uma foto de um vínculo anterior.
  if (!user.avatarUrl && identity.picture) {
    await deps.repos.user.updateAvatarUrl(user.id, identity.picture);
  }

  return right(undefined);
}
