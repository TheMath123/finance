import type { UseCaseDeps } from '../../deps';

export function registerPushToken(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string,
  token: string
): Promise<void> {
  return deps.repos.pushToken.register(userId, token);
}

export function unregisterPushToken(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string,
  token: string
): Promise<void> {
  return deps.repos.pushToken.unregister(userId, token);
}
