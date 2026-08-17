import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

import { BiometricLockScreen } from '@/components/biometric-lock-screen';
import {
  BiometricLockProvider,
  useBiometricLock,
} from '@/context/biometric-lock';
import { useSession } from '@/context/session';
import { useNotificationCapture } from '@/lib/hooks/use-notification-capture';
import {
  type NotificationStreamMessage,
  subscribeToNotificationStream,
} from '@/lib/notification-stream';

/**
 * As 3 telas de tab (Resumo/Transações/Contas) ficam no grupo (tabs), que
 * renderiza a barra customizada (AppTabs). Toda tela fora desse grupo — edição,
 * criação, listas dedicadas (cartões, categorias, perfil, lixeira) — é
 * empilhada por este Stack por cima da tab bar, cobrindo a tela toda. Sem
 * isso, o Tabs headless (expo-router/ui) só conhece as 3 rotas registradas
 * como TabTrigger e ignora silenciosamente qualquer push pra rota irmã.
 */
function AppStack() {
  const { ready, locked } = useBiometricLock();
  if (ready && locked) return <BiometricLockScreen />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

/** Repassa a notificação pras queries que cada tela usa — sem isso, o app só atualizaria reabrindo a tela. */
function invalidateForMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  message: NotificationStreamMessage
) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const data = message.data ?? {};
  if (data.transferId) {
    queryClient.invalidateQueries({ queryKey: ['transfers-pending'] });
  }
  if (data.splitId) {
    queryClient.invalidateQueries({ queryKey: ['splits-owed-by-me'] });
    queryClient.invalidateQueries({ queryKey: ['splits-owed-to-me'] });
  }
  if (data.inviteId) {
    queryClient.invalidateQueries({ queryKey: ['my-invites'] });
  }
}

export default function AppLayout() {
  const { user, isLoading } = useSession();
  const queryClient = useQueryClient();

  useNotificationCapture(Boolean(user));

  useEffect(() => {
    if (!user) return;
    return subscribeToNotificationStream((message) =>
      invalidateForMessage(queryClient, message)
    );
  }, [user, queryClient]);

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <BiometricLockProvider>
      <AppStack />
    </BiometricLockProvider>
  );
}
