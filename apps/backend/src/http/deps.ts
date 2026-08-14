import type { UseCaseDeps } from '../application/deps';
import type { Logger } from '../infra/observability/logger';

/** Dependências da camada http = use cases + config específica de transporte. */
export interface AppDeps extends UseCaseDeps {
  trustProxy: boolean;
  /** Logger estruturado (pino) para a camada http — distinto do `logger` de domínio (SecurityLogger). */
  httpLogger: Logger;
}
