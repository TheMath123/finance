import { type Either, left, right } from '@finance/shared';
import type { User } from '../../../domain/entities/user';
import { VERIFY_EMAIL_TOKEN_TTL_MS } from '../../../infra/security/jose-token-service';
import type { UseCaseDeps } from '../../deps';
import { isUniqueConstraintError } from '../../errors';
import { createPersonalWorkspace } from './create-personal-workspace';
import type { AuthError } from './errors';
import { type AuthSession, issueSession } from './session';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function register(
  deps: UseCaseDeps,
  input: RegisterInput
): Promise<Either<AuthError, AuthSession>> {
  const existing = await deps.repos.user.findByEmail(input.email);
  if (existing) return left('email_taken');

  const passwordHash = await deps.hasher.hash(input.password);

  let created: { user: User; workspaceId: string };
  try {
    created = await deps.uow.run(async (repos) => {
      const user = await repos.user.create({
        name: input.name,
        email: input.email,
        passwordHash,
        termsAcceptedAt: new Date(),
        termsVersion: deps.termsVersion,
      });

      const { workspaceId } = await createPersonalWorkspace(repos, user.id);

      return { user, workspaceId };
    });
  } catch (error) {
    // Corrida: dois registros simultâneos do mesmo e-mail — o unique index decide
    if (isUniqueConstraintError(error)) return left('email_taken');
    throw error;
  }
  const { user, workspaceId } = created;

  const verify = deps.tokens.generateOpaque();
  await deps.repos.token.createAuthToken({
    userId: user.id,
    purpose: 'email_verification',
    tokenHash: verify.hash,
    expiresAt: new Date(Date.now() + VERIFY_EMAIL_TOKEN_TTL_MS),
  });
  const verifyUrl = new URL('/verify-email', deps.dashboardOrigin);
  verifyUrl.searchParams.set('token', verify.raw);
  await deps.dispatch('email.verify-email', {
    to: user.email,
    name: user.name,
    verifyUrl: verifyUrl.toString(),
  });

  return right(await issueSession(deps, user, workspaceId));
}
