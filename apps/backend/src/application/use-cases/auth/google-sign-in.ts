import { type Either, left, right } from '@finance/shared';
import type { User } from '../../../domain/entities/user';
import type { UseCaseDeps } from '../../deps';
import { isUniqueConstraintError } from '../../errors';
import { createPersonalWorkspace } from './create-personal-workspace';
import type { AuthError } from './errors';
import { type AuthSession, issueSession } from './session';

export interface GoogleSignInInput {
  idToken: string;
  termsAccepted: true;
}

/**
 * Login/cadastro via Google (ver plano de OAuth). Só valida o ID token —
 * não conduz nenhum redirect: o token já chega pronto do Google Identity
 * Services (dashboard) ou expo-auth-session (mobile, Fase 2).
 */
export async function googleSignIn(
  deps: UseCaseDeps,
  input: GoogleSignInInput
): Promise<Either<AuthError, AuthSession>> {
  const identity = await deps.googleIdentity.verifyIdToken(input.idToken);
  if (!identity) return left('google_token_invalid');
  if (!identity.emailVerified) return left('google_email_unverified');

  const existingAccount = await deps.repos.oauthAccount.findByProvider(
    'google',
    identity.sub
  );

  let user: User;
  let workspaceId: string;

  if (existingAccount) {
    const linkedUser = await deps.repos.user.findById(existingAccount.userId);
    if (!linkedUser) {
      throw new Error('oauth_account sem usuário vinculado');
    }
    if (!linkedUser.defaultWorkspaceId) return left('google_token_invalid');
    if (linkedUser.suspendedAt) return left('account_suspended');
    user = linkedUser;
    workspaceId = linkedUser.defaultWorkspaceId;
  } else {
    const existingUser = await deps.repos.user.findByEmail(identity.email);
    if (existingUser) return left('google_email_registered');

    // Placeholder inadivinhável — nunca bate com nenhuma senha real, então
    // login por senha nessa conta falha do jeito normal (invalid_credentials),
    // sem precisar de nenhum if novo em login.ts.
    const passwordHash = await deps.hasher.hash(
      deps.tokens.generateOpaque().raw
    );

    let created: { user: User; workspaceId: string };
    try {
      created = await deps.uow.run(async (repos) => {
        const newUser = await repos.user.create({
          name: identity.name,
          email: identity.email,
          passwordHash,
          termsAcceptedAt: new Date(),
          termsVersion: deps.termsVersion,
        });
        const { workspaceId: newWorkspaceId } = await createPersonalWorkspace(
          repos,
          newUser.id
        );
        await repos.user.markEmailVerified(newUser.id);
        await repos.oauthAccount.create({
          userId: newUser.id,
          provider: 'google',
          providerAccountId: identity.sub,
          email: identity.email,
        });
        return { user: newUser, workspaceId: newWorkspaceId };
      });
    } catch (error) {
      // Corrida: dois cadastros simultâneos do mesmo e-mail — unique index decide
      if (isUniqueConstraintError(error)) return left('email_taken');
      throw error;
    }
    // Google já verificou o e-mail — reflete isso na sessão emitida sem nova query
    user = { ...created.user, emailVerifiedAt: new Date() };
    workspaceId = created.workspaceId;
  }

  return right(await issueSession(deps, user, workspaceId));
}
