import type { UseCaseDeps } from "../application/deps";

/** Dependências da camada http = use cases + config específica de transporte. */
export interface AppDeps extends UseCaseDeps {
  trustProxy: boolean;
}
