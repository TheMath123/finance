import { NativeModule, requireNativeModule } from 'expo';

import type { NotificationListenerModuleEvents } from './NotificationListener.types';

declare class NotificationListenerModule extends NativeModule<NotificationListenerModuleEvents> {
  /** Lê `NotificationManagerCompat.getEnabledListenerPackages` — não existe API de permissão em tempo real pra isso, só esse retrospecto. */
  isPermissionGranted(): boolean;
  /** Abre `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` — único jeito de o usuário conceder o acesso, não existe diálogo padrão do sistema. */
  openNotificationSettings(): void;
}

export default requireNativeModule<NotificationListenerModule>(
  'NotificationListener'
);
