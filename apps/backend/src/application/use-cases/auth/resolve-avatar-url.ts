import type { User } from '../../../domain/entities/user';
import type { UseCaseDeps } from '../../deps';

/** Mesmo TTL do anexo de comprovante (M3-04) — só precisa sobreviver ao carregamento da página que pediu a sessão. */
export const AVATAR_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Resolve a URL final do avatar pra expor em `AuthSession`/`MeOutput` —
 * prioridade: `avatarKey` (upload manual, assinado sob demanda no storage
 * privado) > `avatarUrl` (externo, hoje só a `picture` do Google) > `null`
 * (client cai pro fallback de iniciais). Usado por `session.ts` (issueSession)
 * e `me.ts`, pra nunca duplicar essa regra.
 */
export async function resolveAvatarUrl(
  deps: Pick<UseCaseDeps, 'storage'>,
  user: Pick<User, 'avatarKey' | 'avatarUrl'>
): Promise<string | null> {
  if (user.avatarKey) {
    return deps.storage.getSignedReadUrl(
      user.avatarKey,
      AVATAR_SIGNED_URL_TTL_SECONDS
    );
  }
  return user.avatarUrl;
}
