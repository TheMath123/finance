import { createDb } from "@finance/db";
import { createBullMqDispatcher } from "@finance/queues";
import { createS3Storage } from "@finance/storage";
import { createRepositories } from "../infra/db/repositories";
import { createUnitOfWork } from "../infra/db/unit-of-work";
import { bunPasswordHasher } from "../infra/security/bun-password-hasher";
import { createTokenService } from "../infra/security/jose-token-service";
import { createRedisRateLimiter } from "../infra/security/redis-rate-limiter";
import { createRedisTokenBudget } from "../infra/ai/redis-token-budget";
import { createRedisCache } from "../infra/cache/redis-cache";
import { createRedisNotificationBus } from "../infra/realtime/redis-notification-bus";
import { createLogger } from "../infra/observability/logger";
import { createSecurityLogger } from "../infra/observability/pino-security-logger";
import type { AppDeps } from "../http/deps";
import type { Env } from "./env";

/**
 * Composition root: monta as implementações de infra atrás dos ports e devolve
 * as dependências prontas para a camada http (spec: Clean Architecture).
 */
export function createAppDeps(env: Env): AppDeps {
  const db = createDb();
  const logger = createLogger(env.LOG_LEVEL);

  const dispatcher = createBullMqDispatcher(env.REDIS_URL, (job, error) =>
    logger.error({ scope: "queues", job, err: error }, "job_failed"),
  );

  return {
    repos: createRepositories(db),
    uow: createUnitOfWork(db),
    hasher: bunPasswordHasher,
    tokens: createTokenService(env.JWT_SECRET),
    dispatch: dispatcher.dispatch,
    logger: createSecurityLogger(logger),
    rateLimiter: createRedisRateLimiter(env.REDIS_URL),
    tokenBudget: createRedisTokenBudget(env.REDIS_URL),
    cache: createRedisCache(env.REDIS_URL),
    notificationBus: createRedisNotificationBus(env.REDIS_URL),
    storage: createS3Storage({
      bucket: env.STORAGE_BUCKET,
      region: env.STORAGE_REGION,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      endpoint: env.STORAGE_ENDPOINT,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    }),
    termsVersion: env.TERMS_VERSION,
    trustProxy: env.TRUST_PROXY,
    dashboardOrigin: env.DASHBOARD_ORIGIN,
    httpLogger: logger,
  };
}
