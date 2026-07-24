import { type Either, left, right } from '@finance/shared';
import type { Actor, UseCaseDeps } from '../../deps';
import type { AttachmentError } from './errors';

/** Curta de propósito — nunca fica pública indefinidamente. */
const SIGNED_URL_TTL_SECONDS = 300;

export async function getAttachmentUrl(
  deps: Pick<UseCaseDeps, 'repos' | 'storage'>,
  actor: Actor,
  transactionId: string
): Promise<Either<AttachmentError, { url: string }>> {
  const transaction = await deps.repos.transaction.findInWorkspace(
    actor.workspaceId,
    transactionId
  );
  if (!transaction) return left('transaction_not_found');
  if (!transaction.attachmentKey) return left('attachment_not_found');

  const url = await deps.storage.getSignedReadUrl(
    transaction.attachmentKey,
    SIGNED_URL_TTL_SECONDS
  );
  return right({ url });
}
