export interface NotificationBusMessage {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

/** Fan-out em tempo real (SSE) de notificações recém-criadas — complementa `notifications` (histórico) e push. */
export interface NotificationBus {
  publish(userId: string, message: NotificationBusMessage): Promise<void>;
  /** Chama `onMessage` a cada notificação nova do usuário; retorna a função de cancelamento. */
  subscribe(
    userId: string,
    onMessage: (message: NotificationBusMessage) => void
  ): () => void;
}
