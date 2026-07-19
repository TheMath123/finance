import type { Db } from "@finance/db";
import type { JobName, JobPayloads } from "@finance/queues";
import { createInMemoryStorage } from "@finance/storage";
import { createRepositories } from "../infra/db/repositories";
import { createUnitOfWork } from "../infra/db/unit-of-work";
import { bunPasswordHasher } from "../infra/security/bun-password-hasher";
import { createTokenService } from "../infra/security/jose-token-service";
import { createInMemoryRateLimiter } from "../infra/security/in-memory-rate-limiter";
import { createInMemoryTokenBudget } from "../infra/ai/in-memory-token-budget";
import { createInMemoryCache } from "../infra/cache/in-memory-cache";
import type { UseCaseDeps } from "../application/deps";

export type DispatchedJob = { name: JobName; payload: JobPayloads[JobName] };

/** Monta UseCaseDeps reais (mesmas fábricas do composition root) para testes contra Postgres. */
export function createTestDeps(db: Db, jobs: DispatchedJob[] = []): UseCaseDeps {
  return {
    repos: createRepositories(db),
    uow: createUnitOfWork(db),
    hasher: bunPasswordHasher,
    tokens: createTokenService("segredo-de-teste-com-mais-de-32-caracteres!!"),
    dispatch: async (name, payload) => {
      jobs.push({ name, payload });
    },
    logger: { log: () => {} },
    rateLimiter: createInMemoryRateLimiter(),
    tokenBudget: createInMemoryTokenBudget(),
    cache: createInMemoryCache(),
    storage: createInMemoryStorage(),
    termsVersion: "test",
  };
}
