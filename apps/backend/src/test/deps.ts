import type { Db } from '@finance/db';
import type { JobName, JobPayloads } from '@finance/queues';
import { createInMemoryStorage } from '@finance/storage';
import type { UseCaseDeps } from '../application/deps';
import { createInMemoryTokenBudget } from '../infra/ai/in-memory-token-budget';
import { createInMemoryCache } from '../infra/cache/in-memory-cache';
import { createRepositories } from '../infra/db/repositories';
import { createUnitOfWork } from '../infra/db/unit-of-work';
import { createInMemoryNotificationBus } from '../infra/realtime/in-memory-notification-bus';
import { bunPasswordHasher } from '../infra/security/bun-password-hasher';
import { createInMemoryRateLimiter } from '../infra/security/in-memory-rate-limiter';
import { createTokenService } from '../infra/security/jose-token-service';

export type DispatchedJob = { name: JobName; payload: JobPayloads[JobName] };

/** Monta UseCaseDeps reais (mesmas fábricas do composition root) para testes contra Postgres. */
export function createTestDeps(
  db: Db,
  jobs: DispatchedJob[] = []
): UseCaseDeps {
  return {
    repos: createRepositories(db),
    uow: createUnitOfWork(db),
    hasher: bunPasswordHasher,
    tokens: createTokenService('segredo-de-teste-com-mais-de-32-caracteres!!'),
    dispatch: async (name, payload) => {
      jobs.push({ name, payload });
    },
    logger: { log: () => {} },
    rateLimiter: createInMemoryRateLimiter(),
    tokenBudget: createInMemoryTokenBudget(),
    cache: createInMemoryCache(),
    notificationBus: createInMemoryNotificationBus(),
    storage: createInMemoryStorage(),
    termsVersion: 'test',
  };
}
