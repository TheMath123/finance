import { Elysia } from 'elysia';
import type { AppDeps } from '../../../deps';
import { requireAuthenticated } from '../../../guards';
import { fail } from '../../../http-error';

const HEARTBEAT_MS = 25_000;

/**
 * Notificações em tempo real via SSE — o app assina isso ao logar (ver
 * `notification-stream.ts` no mobile) pra atualizar a lista/badge sem precisar
 * reabrir a aba. Não substitui push (mantém funcionando com app fechado) nem
 * o histórico em `/notifications` — é só o "empurrão" pra quem já está com o
 * app aberto. Autenticado por `Authorization: Bearer` normal (cliente RN
 * consegue mandar headers custom num EventSource, diferente do browser).
 */
export const notificationStreamRoute = (deps: AppDeps) =>
  new Elysia().get('/notifications/stream', async ({ request, set }) => {
    const auth = await requireAuthenticated(deps, request);
    if (!auth.ok) return fail(set, auth.error);

    const userId = auth.value.userId;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        const send = (message: unknown) => {
          if (closed) return;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
        };
        const unsubscribe = deps.notificationBus.subscribe(userId, send);
        // Bun só libera os headers da resposta quando o primeiro dado é
        // escrito no stream — sem isto, a conexão fica "pendurada" (sem
        // headers nem body) até o primeiro heartbeat, até 25s depois.
        controller.enqueue(encoder.encode(`: connected\n\n`));
        const heartbeat = setInterval(() => {
          if (closed) return;
          controller.enqueue(encoder.encode(`: ping\n\n`));
        }, HEARTBEAT_MS);

        const cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // já fechado do outro lado — sem problema.
          }
        };
        request.signal.addEventListener('abort', cleanup);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  });
