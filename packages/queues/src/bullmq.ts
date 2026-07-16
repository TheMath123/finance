import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import type { QueueDispatcher } from "./dispatcher";
import type { JobHandlers, JobName, JobPayloads } from "./jobs";

/**
 * Fila única do M2 — cada entrada carrega o nome do job + payload (mesmo par
 * usado pelo dispatcher direto do M1). Se um domínio futuro (WhatsApp,
 * notificações) precisar de fila própria (prioridade/concorrência diferente),
 * criar uma nova `Queue`/`QUEUE_NAME` aqui é ok — mas o worker que a consome
 * continua tendo que rodar dentro do MESMO processo (`main/worker.ts`), nunca
 * um `bun run worker` por fila (spec: "Um único processo worker, várias
 * filas", decisão de 2026-07-16).
 */
export const QUEUE_NAME = "finance-jobs";

interface QueueEntry<N extends JobName = JobName> {
  name: N;
  payload: JobPayloads[N];
}

/** BullMQ exige essa opção pra não abortar jobs em espera quando a conexão cai. */
function createConnection(redisUrl: string) {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

/**
 * Dispatcher real do M2: enfileira no Redis em vez de rodar o handler na hora
 * (spec: "a Meta exige resposta rápida" — processamento sai do caminho síncrono
 * da request). Mesma interface `QueueDispatcher` do dispatcher direto do M1 —
 * inclusive o contrato de nunca rejeitar (uma falha ao enfileirar não pode
 * derrubar quem chamou `dispatch` no meio de um fluxo como registro/reset).
 */
export function createBullMqDispatcher(
  redisUrl: string,
  onError: (job: JobName, error: unknown) => void = (job, error) =>
    console.error(`[queues] falha ao enfileirar job "${job}":`, error),
): QueueDispatcher {
  const queue = new Queue<QueueEntry>(QUEUE_NAME, { connection: createConnection(redisUrl) });
  return {
    async dispatch(name, payload) {
      try {
        await queue.add(name, { name, payload }, {
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: true,
          removeOnFail: 100,
        });
      } catch (error) {
        onError(name, error);
      }
    },
  };
}

/**
 * Worker que consome a fila num processo separado (`main/worker.ts`) e executa
 * os mesmos handlers que o dispatcher direto do M1 rodava inline. Se surgir uma
 * segunda fila (ver `QUEUE_NAME` acima), instanciar um segundo `Worker` dentro
 * do MESMO `main/worker.ts` — não criar um novo entrypoint/processo.
 */
export function createBullMqWorker(
  redisUrl: string,
  handlers: JobHandlers,
  onError: (job: JobName, error: unknown) => void,
): Worker<QueueEntry> {
  const worker = new Worker<QueueEntry>(
    QUEUE_NAME,
    async (job) => {
      const { name, payload } = job.data;
      // Correlação nome↔payload é garantida por quem chamou dispatch<N>(name, payload);
      // depois de serializado no Redis, o TS não consegue mais provar isso sozinho.
      await (handlers[name] as (p: unknown) => Promise<void>)(payload);
    },
    { connection: createConnection(redisUrl) },
  );
  worker.on("failed", (job, error) => {
    if (job) onError(job.data.name, error);
  });
  return worker;
}
