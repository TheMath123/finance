import type { Repositories } from "./repositories";

/**
 * Transação de banco atravessando múltiplos repositórios: tudo dentro de `run`
 * commita ou reverte junto (mutação + auditoria atômicas — spec).
 */
export interface UnitOfWork {
  run<T>(fn: (repos: Repositories) => Promise<T>): Promise<T>;
}
