import type { JobHandlers, JobName, JobPayloads } from "./jobs";

/**
 * Interface única de enfileiramento. M1 usa o dispatcher direto (fire-and-forget,
 * sem Redis); no M2 uma implementação BullMQ substitui por trás da mesma interface.
 */
export interface QueueDispatcher {
  dispatch<N extends JobName>(name: N, payload: JobPayloads[N]): Promise<void>;
}

/**
 * Dispatcher do M1: executa o handler imediatamente, sem bloquear o chamador
 * e sem derrubar a request se o job falhar (loga e segue).
 */
export function createDirectDispatcher(
  handlers: JobHandlers,
  onError: (job: JobName, error: unknown) => void = (job, error) =>
    console.error(`[queues] job "${job}" falhou:`, error),
): QueueDispatcher {
  return {
    async dispatch(name, payload) {
      // Promise.resolve().then(...) captura também erros SÍNCRONOS do handler
      void Promise.resolve()
        .then(() => handlers[name](payload))
        .catch((error) => onError(name, error));
    },
  };
}
