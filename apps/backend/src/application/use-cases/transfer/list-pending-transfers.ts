import type { UseCaseDeps } from '../../deps';

export interface PendingTransferView {
  id: string;
  amount: number;
  description: string;
  expiresAt: Date;
  createdAt: Date;
  fromUserName: string;
}

/** Transferências recebidas aguardando aceite/recusa. */
export async function listPendingTransfers(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: { userId: string }
): Promise<PendingTransferView[]> {
  const transfers = await deps.repos.interUserTransfer.listPendingForUser(
    actor.userId
  );
  const views: PendingTransferView[] = [];
  for (const transfer of transfers) {
    const sender = await deps.repos.user.findById(transfer.fromUserId);
    views.push({
      id: transfer.id,
      amount: transfer.amount,
      description: transfer.description,
      expiresAt: transfer.expiresAt,
      createdAt: transfer.createdAt,
      fromUserName: sender?.name ?? 'Usuário',
    });
  }
  return views;
}
