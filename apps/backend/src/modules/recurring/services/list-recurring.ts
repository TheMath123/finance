import { eq } from "drizzle-orm";
import { recurringTransactions, type RecurringTransaction } from "@finance/db";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";

export async function listRecurring(
  deps: DbDeps,
  actor: Actor,
): Promise<RecurringTransaction[]> {
  return deps.db.query.recurringTransactions.findMany({
    where: eq(recurringTransactions.workspaceId, actor.workspaceId),
  });
}
