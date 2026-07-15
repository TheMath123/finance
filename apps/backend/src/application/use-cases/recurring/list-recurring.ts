import type { RecurringTransaction } from "../../../domain/entities/recurring-transaction";
import type { Actor, UseCaseDeps } from "../../deps";

export async function listRecurring(
  deps: UseCaseDeps,
  actor: Actor,
): Promise<RecurringTransaction[]> {
  return deps.repos.recurring.listByWorkspace(actor.workspaceId);
}
