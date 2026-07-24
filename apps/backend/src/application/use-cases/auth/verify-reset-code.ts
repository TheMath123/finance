import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AuthError } from './errors';

export interface VerifyResetCodeInput {
  email: string;
  code: string;
}

/**
 * Checagem NÃO consome o código (spec do fluxo: validar antes de ir pra tela de
 * nova senha, mas o reset de verdade revalida e consome no reset-password).
 * Resposta sempre genérica — não revela se o e-mail existe (mesmo motivo do
 * forgot-password: diferenciar viraria oráculo de enumeração de conta).
 */
export async function verifyResetCode(
  deps: UseCaseDeps,
  input: VerifyResetCodeInput
): Promise<Either<AuthError, null>> {
  // Código de 6 dígitos = espaço pequeno; limite curto por e-mail alvo evita força bruta
  if (
    await deps.rateLimiter.isLimited(
      `reset-code:${input.email}`,
      5,
      15 * 60_000
    )
  ) {
    return left('invalid_code');
  }

  const user = await deps.repos.user.findByEmail(input.email);
  if (!user) return left('invalid_code');

  const stored = await deps.repos.token.findValidAuthTokenForUser(
    user.id,
    'password_reset',
    deps.tokens.hashOpaque(input.code)
  );
  if (!stored) return left('invalid_code');

  return right(null);
}
