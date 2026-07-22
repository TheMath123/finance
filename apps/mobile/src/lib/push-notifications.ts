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
let categoriesConfigured = false;

/**
 * Ação rápida direto na notificação (recusar transferência, marcar/confirmar
 * split) sem precisar abrir o app numa lista pra achar o item — categoria
 * some tipo tem 1 ação sem input extra (aceitar transferência continua só
 * abrindo o app, porque precisa escolher a conta de destino). `opensAppToForeground`
 * fica no padrão (`true`): com `false` a ação não dispara o listener se o app
 * estiver morto (não só em segundo plano) — preferível abrir o app rapidinho
 * a simplesmente não executar a ação.
 */
async function registerNotificationCategories(Notifications: typeof import('expo-notifications')): Promise<void> {
  if (categoriesConfigured) return;
  categoriesConfigured = true;
  await Notifications.setNotificationCategoryAsync('transfer_pending', [
    { identifier: 'reject_transfer', buttonTitle: 'Recusar' },
  ]);
  await Notifications.setNotificationCategoryAsync('split_payment_pending', [
    { identifier: 'mark_paid', buttonTitle: 'Marquei como pago' },
  ]);
  await Notifications.setNotificationCategoryAsync('split_payment_paid', [
    { identifier: 'confirm_reimbursement', buttonTitle: 'Confirmar recebimento' },
  ]);
}

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

  await registerNotificationCategories(Notifications);

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

export type NotificationResponse =
  | { kind: 'tap'; data: Record<string, unknown> | undefined }
  | { kind: 'action'; actionIdentifier: string; data: Record<string, unknown> | undefined };

/**
 * Listener de interação com notificação (app em background/fechado) — chamado
 * só quando suportado aqui. Distingue toque no corpo ('tap', navega pro
 * destino de sempre) de toque num botão de ação rápida ('action', ver
 * `registerNotificationCategories` acima e `notification-actions.ts`).
 */
export function addNotificationResponseListener(onResponse: (response: NotificationResponse) => void): () => void {
  const Notifications = loadNotificationsModule();
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      onResponse({ kind: 'tap', data });
    } else {
      onResponse({ kind: 'action', actionIdentifier: response.actionIdentifier, data });
    }
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
  if (data.splitId) return '/splits';
  return null;
}
