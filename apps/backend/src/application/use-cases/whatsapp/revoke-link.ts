import type { UseCaseDeps } from '../../deps';

/** Revoga o vínculo do WhatsApp (autenticado, configurações do app). */
export async function revokeWhatsAppLink(
  deps: Pick<UseCaseDeps, 'repos'>,
  userId: string
): Promise<void> {
  await deps.repos.user.updatePhone(userId, null);
}
