export type NotificationListenerModuleEvents = {
  onNotificationPosted: (event: NotificationPostedEvent) => void;
};

/** Espelha o payload montado em AppNotificationListenerService.kt (Android). */
export type NotificationPostedEvent = {
  packageName: string;
  postTime: number;
  title: string | null;
  text: string | null;
  bigText: string | null;
};
