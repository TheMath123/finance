import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { parseBankNotification } from '@/lib/bank-notification-parser';
import { formatCents } from '@/lib/money';
import {
  isNotificationAccessGranted,
  notificationListenerAvailable,
  subscribeToNotifications,
} from '@/lib/notification-listener';
import { pendingTransactionStore } from '@/lib/pending-transaction-store';
import { presentLocalNotification } from '@/lib/push-notifications';
import { notificationCaptureStore } from '@/lib/secure-store';

/**
 * Liga a captura de notificações bancárias assim que a preferência do
 * usuário está ligada E a permissão do sistema já foi concedida — os dois
 * são independentes (a permissão é dada uma vez lá nas Configurações do
 * Android, ver notification-access.tsx). Reavalia sempre que o app volta pro
 * primeiro plano, porque é só aí que dá pra saber se o usuário acabou de
 * conceder a permissão na tela do sistema (não existe callback pra isso).
 */
export function useNotificationCapture(enabled: boolean): void {
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !notificationListenerAvailable) return;

    let cancelled = false;

    async function evaluate() {
      if (unsubscribeRef.current) return; // já assinado — nada a fazer
      // Checa a preferência local ANTES de tocar em isNotificationAccessGranted
      // (que força o require() do módulo nativo) — evita o "Cannot find native
      // module" do Expo Go pra quem nunca ligou o toggle (caso comum/default).
      const captureEnabled = await notificationCaptureStore.getEnabled();
      if (cancelled || !captureEnabled) return;
      if (!isNotificationAccessGranted()) return;

      unsubscribeRef.current = subscribeToNotifications((event) => {
        const parsed = parseBankNotification(event);
        if (!parsed) return;
        pendingTransactionStore.add(parsed).then(() => {
          queryClient.invalidateQueries({
            queryKey: ['pending-notification-suggestions'],
          });
          presentLocalNotification(
            'Transação detectada',
            `${parsed.bankLabel} — ${formatCents(parsed.amountCents)}. Toque para revisar.`
          );
        });
      });
    }

    evaluate();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') evaluate();
    });

    return () => {
      cancelled = true;
      subscription.remove();
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [enabled, queryClient]);
}
