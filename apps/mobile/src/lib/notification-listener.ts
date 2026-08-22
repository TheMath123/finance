import { Platform } from 'react-native';

import type { NotificationPostedEvent } from '../../modules/notification-listener/src/NotificationListener.types';
import type NativeNotificationListenerModule from '../../modules/notification-listener/src/NotificationListenerModule';

/** Só existe implementação Android (ver expo-module.config.json) — iOS não tem API pra ler notificação de outro app. */
export const notificationListenerAvailable = Platform.OS === 'android';

type NotificationListenerModuleType = typeof NativeNotificationListenerModule;

let cachedModule: NotificationListenerModuleType | null = null;

/**
 * Módulo local (modules/notification-listener), não publicado no npm — só
 * existe no binário depois de um dev client/release rebuildado com ele
 * dentro. Igual ao padrão de lib/hooks/use-google-auth.ts: nunca importar
 * estático no topo de um arquivo sempre carregado, senão o `require`
 * nativo (TurboModuleRegistry) derruba o app no boot em qualquer instalação
 * sem esse módulo compilado (Expo Go, ou um dev client anterior a ele).
 */
function loadNotificationListener(): NotificationListenerModuleType | null {
  if (!notificationListenerAvailable) return null;
  if (!cachedModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- import estático quebraria o boot sem dev client rebuildado (ver comentário acima)
      const mod = require('../../modules/notification-listener').default;
      cachedModule = mod as NotificationListenerModuleType;
    } catch {
      return null;
    }
  }
  return cachedModule;
}

/** `false` também quando o módulo nativo não está disponível nesta instalação (não é um erro, só "recurso ausente"). */
export function isNotificationAccessGranted(): boolean {
  return loadNotificationListener()?.isPermissionGranted() ?? false;
}

/** Único jeito de conceder o acesso — abre a tela de Configurações do Android, não existe diálogo padrão pra isso. */
export function openNotificationAccessSettings(): void {
  loadNotificationListener()?.openNotificationSettings();
}

/** Assina notificações novas do sistema. Retorna um `unsubscribe` — chame sempre ao desmontar, mesmo se o módulo não estiver disponível (função vazia, segura). */
export function subscribeToNotifications(
  onNotification: (event: NotificationPostedEvent) => void
): () => void {
  const mod = loadNotificationListener();
  if (!mod) return () => {};
  const subscription = mod.addListener('onNotificationPosted', onNotification);
  return () => subscription.remove();
}

/**
 * Notificações que chegaram nativamente enquanto o app estava fechado/em
 * segundo plano (sem bridge JS viva pro evento ao vivo alcançar) — sem isso
 * eram descartadas silenciosamente, mesmo com a permissão concedida. Lê e
 * limpa o buffer nativo de uma vez; chamar sempre que o app volta pro
 * primeiro plano (ver use-notification-capture.ts).
 */
export function drainBufferedNotifications(): NotificationPostedEvent[] {
  return loadNotificationListener()?.drainBufferedNotifications() ?? [];
}

/**
 * `false` = o Android pode matar o processo do app (e o listener nativo
 * junto) agressivamente quando ele fica em segundo plano — a causa mais
 * comum de "só detecta com o app aberto". `true` também quando o módulo não
 * está disponível (nada a resolver aqui nesse caso).
 */
export function isIgnoringBatteryOptimizations(): boolean {
  return loadNotificationListener()?.isIgnoringBatteryOptimizations() ?? true;
}

/** Abre o diálogo nativo do Android pra isentar o app da otimização de bateria — único jeito de garantir captura confiável com o app fechado. */
export function requestIgnoreBatteryOptimizations(): void {
  loadNotificationListener()?.requestIgnoreBatteryOptimizations();
}
