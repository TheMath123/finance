import type { Db } from "@finance/db";
import type { QueueDispatcher } from "@finance/queues";

/** Dependências injetadas em todos os módulos (testes usam fakes). */
export interface AppDeps {
  db: Db;
  dispatch: QueueDispatcher["dispatch"];
  jwtSecret: string;
  appUrl: string;
  termsVersion: string;
  /** Confiar em X-Forwarded-For apenas atrás do proxy do provedor (spec: Rate limiting). */
  trustProxy: boolean;
}

/** Subconjunto para services de domínio (só banco) — testes injetam apenas { db }. */
export type DbDeps = Pick<AppDeps, "db">;
