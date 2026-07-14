import { eq } from "drizzle-orm";
import { banks, type Bank } from "@finance/db";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";

export async function listBanks(deps: DbDeps, actor: Actor): Promise<Bank[]> {
  return deps.db.query.banks.findMany({ where: eq(banks.workspaceId, actor.workspaceId) });
}
