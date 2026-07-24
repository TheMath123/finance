import { createDb } from '@finance/db';
import {
  createBullMqDispatcher,
  createBullMqWorker,
  QUEUE_NAME,
} from '@finance/queues';
import { createS3Storage } from '@finance/storage';
import { runNotificationSweep } from '../application/use-cases/notification';
import { createRedisTokenBudget } from '../infra/ai/redis-token-budget';
import { createRedisCache } from '../infra/cache/redis-cache';
import { createRepositories } from '../infra/db/repositories';
import { createUnitOfWork } from '../infra/db/unit-of-work';
import { createLogger } from '../infra/observability/logger';
import { createRedisNotificationBus } from '../infra/realtime/redis-notification-bus';
import { createTokenService } from '../infra/security/jose-token-service';
import { createRedisRateLimiter } from '../infra/security/redis-rate-limiter';
import { loadEnv } from './env';
import { createJobHandlers } from './job-handlers';

/**
 * Processo separado que consome a fila do BullMQ (spec M2: Redis + BullMQ —
 * processamento assíncrono dos jobs, tirado do caminho síncrono da request).
 * Roda com `bun run worker` (ver apps/backend/package.json), independente do
 * processo HTTP (`main/index.ts`).
 */
const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL, 'worker');

const db = createDb();
const dispatcher = createBullMqDispatcher(env.REDIS_URL, (job, error) =>
  logger.error({ scope: 'queues', job, err: error }, 'job_failed')
);

/**
 * Deps completas do worker: além do sweep diário, o handler do job
 * `whatsapp.inbound-message` (M2-06/M2-07) precisa confirmar vínculo
 * (`confirmWhatsAppLink` usa `repos`/`uow`/`rateLimiter`/`tokens`) e rodar o
 * pipeline de IA (`tokenBudget` — guardrail de custo por usuário); o handler
 * de `whatsapp.inbound-image` (M3-05) precisa de `storage` pra gravar o
 * comprovante recebido por foto.
 */
const deps = {
  repos: createRepositories(db),
  uow: createUnitOfWork(db),
  rateLimiter: createRedisRateLimiter(env.REDIS_URL),
  tokenBudget: createRedisTokenBudget(env.REDIS_URL),
  cache: createRedisCache(env.REDIS_URL),
  notificationBus: createRedisNotificationBus(env.REDIS_URL),
  tokens: createTokenService(env.JWT_SECRET),
  dispatch: dispatcher.dispatch,
  storage: createS3Storage({
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
  }),
};

const worker = createBullMqWorker(
  env.REDIS_URL,
  createJobHandlers(deps),
  (job, error) =>
    logger.error({ scope: 'queues', job, err: error }, 'job_failed')
);

logger.info({ scope: 'queues', queue: QUEUE_NAME }, 'worker iniciado');

/**
 * Sweep diário (fatura fechou/vence, auto-lançamento de recorrências —
 * M2-09/M2-10). `setInterval` em vez de job repetível do BullMQ: mais
 * simples, e o dedup por `entityKey`/data (ver notification/sweep.ts) já
 * torna reexecuções seguras (ex.: toda vez que `bun run --watch worker`
 * reinicia em dev).
 */
async function runSweepSafely() {
  try {
    await runNotificationSweep(deps);
    logger.info({ scope: 'notifications' }, 'sweep concluído');
  } catch (error) {
    logger.error({ scope: 'notifications', err: error }, 'sweep falhou');
  }
}

void runSweepSafely();
const sweepInterval = setInterval(runSweepSafely, 24 * 60 * 60 * 1000);

async function shutdown() {
  logger.info({ scope: 'queues' }, 'worker encerrando');
  clearInterval(sweepInterval);
  await worker.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
