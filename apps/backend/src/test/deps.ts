import { type Db, plans } from '@finance/db';
import type { JobName, JobPayloads } from '@finance/queues';
import { createInMemoryStorage } from '@finance/storage';
import { eq } from 'drizzle-orm';
import type { UseCaseDeps } from '../application/deps';
import { createInMemoryTokenBudget } from '../infra/ai/in-memory-token-budget';
import { createInMemoryCache } from '../infra/cache/in-memory-cache';
import { createRepositories } from '../infra/db/repositories';
import { createUnitOfWork } from '../infra/db/unit-of-work';
import { createInMemoryNotificationBus } from '../infra/realtime/in-memory-notification-bus';
import { bunPasswordHasher } from '../infra/security/bun-password-hasher';
import { createInMemoryRateLimiter } from '../infra/security/in-memory-rate-limiter';
import { createTokenService } from '../infra/security/jose-token-service';
import { createFakePaymentGateway } from '../infra/stripe/fake-payment-gateway';

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
    payments: createFakePaymentGateway(),
    termsVersion: 'test',
  };
}

/** Plano `free`/`premium` sempre existe (semeado pela migration do M5-02) — testes só precisam do id. */
export async function getTestPlanId(
  db: Db,
  key: 'free' | 'premium' = 'free'
): Promise<string> {
  const [plan] = await db.select().from(plans).where(eq(plans.key, key));
  if (!plan) throw new Error(`plano de teste "${key}" não encontrado`);
  return plan.id;
}
