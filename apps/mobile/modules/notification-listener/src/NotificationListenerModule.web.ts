import { NativeModule, registerWebModule } from 'expo';

import type { NotificationListenerModuleEvents } from './NotificationListener.types';

// NotificationListenerModule is not available on the web platform.
class NotificationListenerModule extends NativeModule<NotificationListenerModuleEvents> {}

export default registerWebModule(
  NotificationListenerModule,
  'NotificationListenerModule'
);
