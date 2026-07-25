import { type Either, left, right } from '@finance/shared';
import {
  isLocked,
  nextLockoutState,
} from '../../../domain/services/lockout-rules';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';
import { type AuthSession, issueSession } from './session';

export interface LoginInput {
  email: string;
  password: string;
}

export async function login(
  deps: UseCaseDeps,
  input: LoginInput
): Promise<Either<AuthError, AuthSession>> {
  const user = await deps.repos.user.findByEmail(input.email);
  if (!user) {
    // Compara contra hash dummy para não vazar existência de conta pelo tempo de resposta
    await deps.hasher.verify(
      input.password,
      await deps.hasher.hash('dummy-password-for-timing')
    );
    return left('invalid_credentials');
  }

  const now = new Date();
  if (isLocked(user.lockedUntil, now)) {
    // Resposta idêntica ao invalid_credentials — qualquer diferenciação vira oráculo
    deps.logger.log('login_failed', { userId: user.id, reason: 'locked' });
    return left('invalid_credentials');
  }

  const valid = await deps.hasher.verify(input.password, user.passwordHash);
  if (!valid) {
    if (user.suspendedAt) {
      // Senha errada numa conta suspensa: prioriza o erro de credenciais —
      // não vaza se a conta existe/está suspensa pra quem não sabe a senha.
      return left('invalid_credentials');
    }
    const { attempts, lockedUntil, lockMinutes } = nextLockoutState(
      user.failedLoginAttempts,
      now
    );
    await deps.repos.user.recordLoginFailure(user.id, attempts, lockedUntil);
    if (lockMinutes !== null) {
      deps.logger.log('account_locked', {
        userId: user.id,
        attempts,
        minutes: lockMinutes,
      });
      await deps.dispatch('email.account-locked', {
        to: user.email,
        name: user.name,
        minutes: lockMinutes,
      });
    } else {
      deps.logger.log('login_failed', { userId: user.id, attempts });
    }
    return left('invalid_credentials');
  }

  if (!user.defaultWorkspaceId) return left('invalid_credentials');

  // Senha certa, mas conta suspensa (M4-08, ação de superadmin) — aqui sim
  // informa o motivo: quem já provou saber a senha não ganha nenhum dado
  // novo ao saber que a conta está suspensa.
  if (user.suspendedAt) return left('account_suspended');

  // Sucesso zera o lockout
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await deps.repos.user.resetLock(user.id);
  }

  return right(await issueSession(deps, user, user.defaultWorkspaceId));
}
