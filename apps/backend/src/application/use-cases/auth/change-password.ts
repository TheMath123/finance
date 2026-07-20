import { left, right, type Either } from "@finance/shared";
import { isLocked, nextLockoutState } from "../../../domain/services/lockout-rules";
import type { UseCaseDeps } from "../../deps";
import type { AuthError } from "./errors";

export interface ChangePasswordInput {
  /** Sempre o ator autenticado (guard extrai do JWT) — nunca um alvo vindo do cliente. */
  userId: string;
  currentPassword: string;
  newPassword: string;
  /**
   * Refresh token da sessão atual, se o cliente o enviar. Quando presente, só
   * ELE sobrevive à revogação (o usuário continua logado no aparelho onde
   * pediu a troca); os demais são revogados. Sem ele, revoga tudo — mesmo
   * comportamento do reset-password (mais seguro, UX pior: força novo login).
   */
  currentRefreshToken?: string;
}

/**
 * Troca de senha a partir do perfil (usuário já logado). Reautentica com a
 * senha ATUAL antes de aceitar a nova — mesmo padrão de `delete-account.ts`
 * (reuso do lockout progressivo do login: 5 tentativas erradas travam a
 * conta, igual login/exclusão de conta).
 */
export async function changePassword(
  deps: UseCaseDeps,
  input: ChangePasswordInput,
): Promise<Either<AuthError, null>> {
  const user = await deps.repos.user.findById(input.userId);
  if (!user) return left("invalid_credentials");

  const now = new Date();
  if (isLocked(user.lockedUntil, now)) return left("invalid_credentials");

  const valid = await deps.hasher.verify(input.currentPassword, user.passwordHash);
  if (!valid) {
    const { attempts, lockedUntil } = nextLockoutState(user.failedLoginAttempts, now);
    await deps.repos.user.recordLoginFailure(user.id, attempts, lockedUntil);
    return left("invalid_credentials");
  }
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await deps.repos.user.resetLock(user.id);
  }

  const passwordHash = await deps.hasher.hash(input.newPassword);
  await deps.uow.run(async (repos) => {
    await repos.user.updatePassword(user.id, passwordHash);
    if (input.currentRefreshToken) {
      await repos.token.deleteAllRefreshByUserExcept(
        user.id,
        deps.tokens.hashOpaque(input.currentRefreshToken),
      );
    } else {
      await repos.token.deleteAllRefreshByUser(user.id);
    }
  });

  await deps.dispatch("email.password-changed", { to: user.email, name: user.name });
  return right(null);
}
