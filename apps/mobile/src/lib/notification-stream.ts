import EventSource from 'react-native-sse';

import { env } from '@/env';
import { tokenStore } from '@/lib/secure-store';

export interface NotificationStreamMessage {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

/** Token de acesso dura ~15min (spec M1) — recria a conexão antes disso pra nunca depender do retry automático da lib com header expirado. */
const RECONNECT_MS = 10 * 60_000;

/**
 * Assina `/notifications/stream` (SSE) enquanto o usuário está logado — é o
 * que faz a lista de notificações (e os badges de transferência/split
 * pendente) atualizar sozinha, sem precisar reabrir a aba. Convive com o
 * push normal (que continua funcionando de app fechado): isso aqui só cobre
 * o caso de app já aberto. Retorna a função de cancelamento (chamada no
 * logout ou ao desmontar).
 */
export function subscribeToNotificationStream(
  onMessage: (message: NotificationStreamMessage) => void
): () => void {
  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const connect = async () => {
    if (stopped) return;
    const token = await tokenStore.getAccessToken();
    if (!token || stopped) return;

    es = new EventSource(`${env.EXPO_PUBLIC_API_URL}/notifications/stream`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    es.addEventListener('message', (event) => {
      if (!event.data) return;
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        // payload inesperado — ignora, não derruba a conexão.
      }
    });

    // 401 = token expirou antes da reconexão programada — o retry automático
    // da lib reusaria o mesmo header velho pra sempre, então força já.
    es.addEventListener('error', (event) => {
      if (event.type === 'error' && event.xhrStatus === 401)
        scheduleReconnect(0);
    });

    scheduleReconnect(RECONNECT_MS);
  };

  const reconnect = () => {
    es?.removeAllEventListeners();
    es?.close();
    void connect();
  };

  const scheduleReconnect = (delayMs: number) => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(reconnect, delayMs);
  };

  void connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    es?.removeAllEventListeners();
    es?.close();
  };
}
