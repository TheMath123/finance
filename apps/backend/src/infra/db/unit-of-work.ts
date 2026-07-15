import type { Db } from "@finance/db";
import type { UnitOfWork } from "../../application/ports/unit-of-work";
import { createRepositories } from "./repositories";

/** UoW sobre db.transaction: repositórios ligados à transação — tudo commita ou reverte junto. */
export function createUnitOfWork(db: Db): UnitOfWork {
  return {
    run: (fn) => db.transaction((tx) => fn(createRepositories(tx))),
  };
}
