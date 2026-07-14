import { eq } from "drizzle-orm";
import { users } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { AppDeps } from "../../../lib/deps";
import { securityLog } from "../../../lib/log";
import type { LoginInput } from "../schemas";
import type { AuthError } from "../errors";
import { BCRYPT, issueSession, type AuthSession } from "./shared";

/** Lockout progressivo (spec: Rate limiting): a cada 5 falhas, trava 1 → 5 → 15 → 60 min. */
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = [1, 5, 15, 60] as const;

export async function login(
  deps: AppDeps,
  input: LoginInput,
): Promise<Either<AuthError, AuthSession>> {
  const user = await deps.db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!user) {
    // Compara contra hash dummy para não vazar existência de conta pelo tempo de resposta
    await Bun.password.verify(input.password, await Bun.password.hash("dummy", BCRYPT));
    return left("invalid_credentials");
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    // Resposta idêntica ao invalid_credentials — qualquer diferenciação vira oráculo
    securityLog("login_failed", { userId: user.id, reason: "locked" });
    return left("invalid_credentials");
  }

  const valid = await Bun.password.verify(input.password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;
    if (attempts % LOCK_THRESHOLD === 0) {
      const level = Math.min(attempts / LOCK_THRESHOLD, LOCK_MINUTES.length) - 1;
      const minutes = LOCK_MINUTES[level]!;
      lockedUntil = new Date(now.getTime() + minutes * 60_000);
      securityLog("account_locked", { userId: user.id, attempts, minutes });
      await deps.dispatch("email.account-locked", {
        to: user.email,
        name: user.name,
        minutes,
      });
    } else {
      securityLog("login_failed", { userId: user.id, attempts });
    }
    await deps.db
      .update(users)
      .set({ failedLoginAttempts: attempts, lockedUntil })
      .where(eq(users.id, user.id));
    return left("invalid_credentials");
  }

  if (!user.defaultWorkspaceId) return left("invalid_credentials");

  // Sucesso zera o lockout
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await deps.db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
  }

  return right(await issueSession(deps, user, user.defaultWorkspaceId));
}
