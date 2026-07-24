import type { QueueDispatcher } from '@finance/queues';
import type { Storage } from '@finance/storage';
import type { Cache } from './ports/cache';
import type { SecurityLogger } from './ports/logger';
import type { NotificationBus } from './ports/notification-bus';
import type { PasswordHasher } from './ports/password-hasher';
import type { RateLimiter } from './ports/rate-limiter';
import type { Repositories } from './ports/repositories';
import type { TokenBudget } from './ports/token-budget';
import type { TokenService } from './ports/token-service';
import type { UnitOfWork } from './ports/unit-of-work';

/** Dependências dos use cases — apenas ports (nunca Drizzle/Elysia). */
export interface UseCaseDeps {
  repos: Repositories;
  uow: UnitOfWork;
  hasher: PasswordHasher;
  tokens: TokenService;
  dispatch: QueueDispatcher['dispatch'];
  logger: SecurityLogger;
  rateLimiter: RateLimiter;
  /** Guardrail de custo de IA (M2-07) — orçamento diário de tokens por usuário. */
  tokenBudget: TokenBudget;
  /** Cache genérico com TTL (M2-08) — evita recalcular a estimativa de gasto variável a cada request. */
  cache: Cache;
  /** Storage de arquivos S3-compatible (M3-01) — anexo de comprovante (M3-04/M3-05) plugam aqui. */
  storage: Storage;
  /** Fan-out em tempo real (SSE) de notificações novas — ver `createNotification`. */
  notificationBus: NotificationBus;
  termsVersion: string;
}

/** Ator autenticado e autorizado num workspace (montado pela camada http). */
export interface Actor {
  userId: string;
  workspaceId: string;
  role: import('@finance/shared').WorkspaceRole;
}
