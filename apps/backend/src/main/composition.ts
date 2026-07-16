import { createDb } from "@finance/db";
import { mailer } from "@finance/email";
import { createDirectDispatcher } from "@finance/queues";
import { createRepositories } from "../infra/db/repositories";
import { createUnitOfWork } from "../infra/db/unit-of-work";
import { bunPasswordHasher } from "../infra/security/bun-password-hasher";
import { createTokenService } from "../infra/security/jose-token-service";
import { createInMemoryRateLimiter } from "../infra/security/in-memory-rate-limiter";
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

  const dispatcher = createDirectDispatcher(
    {
      "email.password-reset": (p) => mailer.sendPasswordReset(p),
      "email.verify-email": (p) => mailer.sendEmailVerification(p),
      "email.password-changed": (p) => mailer.sendPasswordChanged(p),
      "email.account-locked": (p) => mailer.sendAccountLocked(p),
      "email.workspace-invite": (p) => mailer.sendWorkspaceInvite(p),
    },
    (job, error) => logger.error({ scope: "queues", job, err: error }, "job_failed"),
  );

  return {
    repos: createRepositories(db),
    uow: createUnitOfWork(db),
    hasher: bunPasswordHasher,
    tokens: createTokenService(env.JWT_SECRET),
    dispatch: dispatcher.dispatch,
    logger: createSecurityLogger(logger),
    rateLimiter: createInMemoryRateLimiter(),
    termsVersion: env.TERMS_VERSION,
    trustProxy: env.TRUST_PROXY,
    httpLogger: logger,
  };
}
