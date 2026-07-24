import { EventEmitter } from 'node:events';
import { Redis } from 'ioredis';
import type {
  NotificationBus,
  NotificationBusMessage,
} from '../../application/ports/notification-bus';

const CHANNEL_PREFIX = 'notifications:';

/**
 * Pub/sub via Redis (não em memória) porque quem publica pode ser o processo
 * da API (rota HTTP) **ou** o worker (sweep de fatura/recorrência, `main/worker.ts`)
 * — processos separados, sem outro jeito de um SSE aberto na API "ver" um evento
 * criado no worker. Uma única conexão em modo subscribe com `psubscribe` (não uma
 * por conexão SSE) porque ioredis não permite outros comandos numa conexão em
 * modo subscribe — o fan-out por usuário fica por conta do EventEmitter local.
 */
export function createRedisNotificationBus(redisUrl: string): NotificationBus {
  const publisher = new Redis(redisUrl);
  const subscriber = new Redis(redisUrl);
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  void subscriber.psubscribe(`${CHANNEL_PREFIX}*`);
  subscriber.on('pmessage', (_pattern, channel: string, raw: string) => {
    const userId = channel.slice(CHANNEL_PREFIX.length);
    let message: NotificationBusMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    emitter.emit(userId, message);
  });

  return {
    async publish(userId, message) {
      await publisher.publish(
        `${CHANNEL_PREFIX}${userId}`,
        JSON.stringify(message)
      );
    },
    subscribe(userId, onMessage) {
      emitter.on(userId, onMessage);
      return () => emitter.off(userId, onMessage);
    },
  };
}
