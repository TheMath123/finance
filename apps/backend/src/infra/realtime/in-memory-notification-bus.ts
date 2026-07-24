import { EventEmitter } from 'node:events';
import type { NotificationBus } from '../../application/ports/notification-bus';

/** Só pra testes (`test/deps.ts`) — sem Redis, um processo só. */
export function createInMemoryNotificationBus(): NotificationBus {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  return {
    async publish(userId, message) {
      emitter.emit(userId, message);
    },
    subscribe(userId, onMessage) {
      emitter.on(userId, onMessage);
      return () => emitter.off(userId, onMessage);
    },
  };
}
