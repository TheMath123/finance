import { NativeModule, requireNativeModule } from 'expo';

import type {
  NotificationListenerModuleEvents,
  NotificationPostedEvent,
} from './NotificationListener.types';

declare class NotificationListenerModule extends NativeModule<NotificationListenerModuleEvents> {
  /** Lê `NotificationManagerCompat.getEnabledListenerPackages` — não existe API de permissão em tempo real pra isso, só esse retrospecto. */
  isPermissionGranted(): boolean;
  /** Abre `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` — único jeito de o usuário conceder o acesso, não existe diálogo padrão do sistema. */
  openNotificationSettings(): void;
  /** Notificações recebidas nativamente enquanto o app não tinha bridge JS viva (fechado/segundo plano) — lê e limpa o buffer de uma vez. */
  drainBufferedNotifications(): NotificationPostedEvent[];
  /** Se `false`, o Android pode matar o processo (e o listener junto) agressivamente com o app fechado — ver requestIgnoreBatteryOptimizations. */
  isIgnoringBatteryOptimizations(): boolean;
  /** Abre o diálogo nativo do Android pra isentar o app da otimização de bateria — único jeito de garantir captura confiável com o app fechado. */
  requestIgnoreBatteryOptimizations(): void;
}

export default requireNativeModule<NotificationListenerModule>(
  'NotificationListener'
);
