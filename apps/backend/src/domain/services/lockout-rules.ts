/** Lockout progressivo (spec: Rate limiting): a cada 5 falhas, trava 1 → 5 → 15 → 60 min. */
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = [1, 5, 15, 60] as const;

export interface LockoutResult {
  attempts: number;
  lockedUntil: Date | null;
  /** Minutos do travamento — presente só quando este erro disparou um novo lock. */
  lockMinutes: number | null;
}

/** Regra pura: decide o próximo estado de tentativas/lock a partir de uma falha de login. */
export function nextLockoutState(
  currentAttempts: number,
  now: Date
): LockoutResult {
  const attempts = currentAttempts + 1;
  if (attempts % LOCK_THRESHOLD !== 0) {
    return { attempts, lockedUntil: null, lockMinutes: null };
  }
  const level = Math.min(attempts / LOCK_THRESHOLD, LOCK_MINUTES.length) - 1;
  const minutes = LOCK_MINUTES[level]!;
  return {
    attempts,
    lockedUntil: new Date(now.getTime() + minutes * 60_000),
    lockMinutes: minutes,
  };
}

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil > now;
}
