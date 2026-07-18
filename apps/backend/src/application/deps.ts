import type { QueueDispatcher } from "@finance/queues";
import type { Repositories } from "./ports/repositories";
import type { UnitOfWork } from "./ports/unit-of-work";
import type { PasswordHasher } from "./ports/password-hasher";
import type { TokenService } from "./ports/token-service";
import type { SecurityLogger } from "./ports/logger";
import type { RateLimiter } from "./ports/rate-limiter";
import type { TokenBudget } from "./ports/token-budget";

/** Dependências dos use cases — apenas ports (nunca Drizzle/Elysia). */
export interface UseCaseDeps {
  repos: Repositories;
  uow: UnitOfWork;
  hasher: PasswordHasher;
  tokens: TokenService;
  dispatch: QueueDispatcher["dispatch"];
  logger: SecurityLogger;
  rateLimiter: RateLimiter;
  /** Guardrail de custo de IA (M2-07) — orçamento diário de tokens por usuário. */
  tokenBudget: TokenBudget;
  termsVersion: string;
}

/** Ator autenticado e autorizado num workspace (montado pela camada http). */
export interface Actor {
  userId: string;
  workspaceId: string;
  role: import("@finance/shared").WorkspaceRole;
}
