import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { notificationApi } from '@/lib/notification-api';

/**
 * `expo-notifications` lança erro só de ser **importado** (efeito colateral
 * no módulo, não só ao chamar função) quando roda no Expo Go no Android desde
 * o SDK 53 — por isso nunca é importado no topo do arquivo aqui, nem em
 * nenhum arquivo carregado sempre (session.tsx, _layout.tsx). Isso é a única
 * forma segura de conviver com Expo Go (iOS) e dev build (Android) ao mesmo
 * tempo. `require` dinâmico só roda quando este guard já garantiu que é seguro.
 */
function isPushUnsupportedHere(): boolean {
  return Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function loadNotificationsModule(): typeof import('expo-notifications') | null {
  if (isPushUnsupportedHere()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import estático quebraria o Expo Go no Android (ver comentário acima)
  return require('expo-notifications') as typeof import('expo-notifications');
}

let handlerConfigured = false;

/**
 * Pede permissão, pega o token do Expo Push Service e registra no backend.
 * Silencioso se falhar ou se não for suportado aqui (Expo Go + Android) —
 * não pode bloquear login.
 */
export async function registerForPushNotifications(): Promise<void> {
  const Notifications = loadNotificationsModule();
  if (!Notifications) return;

  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await notificationApi.registerPushToken(token);
  } catch (error) {
    console.warn('[push] não foi possível obter/registrar o token do Expo Push Service', error);
  }
}

/** Chamado no logout — evita que o device continue recebendo push depois de sair da conta. */
export async function unregisterCurrentPushToken(): Promise<void> {
  const Notifications = loadNotificationsModule();
  if (!Notifications) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await notificationApi.unregisterPushToken(token).catch(() => {});
  } catch {
    // Sem permissão/token — nada a desregistrar.
  }
}

/** Listener de toque em notificação (app em background/fechado) — chamado só quando suportado aqui. */
export function addNotificationTapListener(
  onTap: (data: Record<string, unknown> | undefined) => void,
): () => void {
  const Notifications = loadNotificationsModule();
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(response.notification.request.content.data as Record<string, unknown> | undefined);
  });
  return () => subscription.remove();
}

/** Deep-link básico a partir do payload da notificação — usado no tap e no toque em foreground (lista de avisos). */
export function notificationTargetRoute(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  if (data.inviteId) return '/invites';
  if (data.cardId) return `/cards/${data.cardId}`;
  if (data.recurringId) return '/explore';
  if (data.transferId) return '/transfers';
  return null;
}
