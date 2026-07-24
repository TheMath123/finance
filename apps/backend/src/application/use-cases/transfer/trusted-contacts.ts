import type { TrustedContact } from '../../../domain/entities/inter-user-transfer';
import type { UseCaseDeps } from '../../deps';

export interface TrustedContactView extends TrustedContact {
  trustedUserName: string;
}

export async function listTrustedContacts(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: { userId: string }
): Promise<TrustedContactView[]> {
  const contacts = await deps.repos.trustedContact.listByUser(actor.userId);
  const views: TrustedContactView[] = [];
  for (const contact of contacts) {
    const trustedUser = await deps.repos.user.findById(contact.trustedUserId);
    views.push({ ...contact, trustedUserName: trustedUser?.name ?? 'Usuário' });
  }
  return views;
}

/** Idempotente e escopado ao dono — repos.trustedContact.delete já filtra por userId. */
export async function removeTrustedContact(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: { userId: string },
  contactId: string
): Promise<void> {
  await deps.repos.trustedContact.delete(contactId, actor.userId);
}
