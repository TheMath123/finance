import { createBullMqWorker, QUEUE_NAME } from "@finance/queues";
import { createLogger } from "../infra/observability/logger";
import { jobHandlers } from "./job-handlers";
import { loadEnv } from "./env";

/**
 * Processo separado que consome a fila do BullMQ (spec M2: Redis + BullMQ —
 * processamento assíncrono dos jobs, tirado do caminho síncrono da request).
 * Roda com `bun run worker` (ver apps/backend/package.json), independente do
 * processo HTTP (`main/index.ts`).
 */
const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);

const worker = createBullMqWorker(env.REDIS_URL, jobHandlers, (job, error) =>
  logger.error({ scope: "queues", job, err: error }, "job_failed"),
);

logger.info({ scope: "queues", queue: QUEUE_NAME }, "worker iniciado");

async function shutdown() {
  logger.info({ scope: "queues" }, "worker encerrando");
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
