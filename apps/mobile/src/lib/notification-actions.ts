import { queryClient } from '@/lib/query-client';
import { splitApi } from '@/lib/split-api';
import { transferApi } from '@/lib/transfer-api';

type ActionHandler = (data: Record<string, unknown>) => Promise<void>;

/**
 * Ações rápidas disparadas direto do botão da notificação (ver
 * `registerNotificationCategories` em `push-notifications.ts`) — nenhuma
 * delas precisa de input extra do usuário, por isso dá pra executar sem
 * abrir nenhuma tela. Aceitar transferência fica de fora (precisa escolher
 * conta de destino).
 */
const ACTION_HANDLERS: Record<string, ActionHandler> = {
  async reject_transfer(data) {
    const transferId = data.transferId;
    if (typeof transferId !== 'string') return;
    await transferApi.reject(transferId);
    queryClient.invalidateQueries({ queryKey: ['transfers-pending'] });
  },
  async mark_paid(data) {
    const shareId = data.shareId;
    if (typeof shareId !== 'string') return;
    await splitApi.markPaid(shareId);
    queryClient.invalidateQueries({ queryKey: ['splits-owed-by-me'] });
  },
  async confirm_reimbursement(data) {
    const shareId = data.shareId;
    if (typeof shareId !== 'string') return;
    await splitApi.confirm(shareId);
    queryClient.invalidateQueries({ queryKey: ['splits-owed-to-me'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  },
};

/** Sem toast pra reportar falha aqui (a ação pode rodar sem nenhuma tela visível) — se der erro, o item continua pendente e o usuário resolve normalmente pela lista. */
export async function handleNotificationAction(
  actionIdentifier: string,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  const handler = ACTION_HANDLERS[actionIdentifier];
  if (!handler || !data) return;
  try {
    await handler(data);
  } catch (error) {
    console.warn('[notifications] falha ao executar ação rápida', actionIdentifier, error);
  }
}
