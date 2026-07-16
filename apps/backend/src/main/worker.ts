import { createDb } from "@finance/db";
import { createBullMqDispatcher, createBullMqWorker, QUEUE_NAME } from "@finance/queues";
import { runNotificationSweep } from "../application/use-cases/notification";
import { createRepositories } from "../infra/db/repositories";
import { createUnitOfWork } from "../infra/db/unit-of-work";
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

/**
 * Sweep diário (fatura fechou/vence, auto-lançamento de recorrências —
 * M2-09/M2-10). `setInterval` em vez de job repetível do BullMQ: mais
 * simples, e o dedup por `entityKey`/data (ver notification/sweep.ts) já
 * torna reexecuções seguras (ex.: toda vez que `bun run --watch worker`
 * reinicia em dev).
 */
const db = createDb();
const sweepDispatcher = createBullMqDispatcher(env.REDIS_URL, (job, error) =>
  logger.error({ scope: "queues", job, err: error }, "job_failed"),
);
const sweepDeps = {
  repos: createRepositories(db),
  uow: createUnitOfWork(db),
  dispatch: sweepDispatcher.dispatch,
};

async function runSweepSafely() {
  try {
    await runNotificationSweep(sweepDeps);
    logger.info({ scope: "notifications" }, "sweep concluído");
  } catch (error) {
    logger.error({ scope: "notifications", err: error }, "sweep falhou");
  }
}

void runSweepSafely();
const sweepInterval = setInterval(runSweepSafely, 24 * 60 * 60 * 1000);

async function shutdown() {
  logger.info({ scope: "queues" }, "worker encerrando");
  clearInterval(sweepInterval);
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
