// Re-export the native module. On web, it will be resolved to NotificationListenerModule.web.ts
// and on native platforms to NotificationListenerModule.ts

export * from './src/NotificationListener.types';
export { default } from './src/NotificationListenerModule';
