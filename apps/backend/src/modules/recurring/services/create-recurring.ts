import { recurringTransactions, type RecurringTransaction } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { RecurringInput } from "../schemas";
import type { RecurringError } from "../errors";
import { validateRefs, validateRule } from "./shared";

export async function createRecurring(
  deps: DbDeps,
  actor: Actor,
  input: RecurringInput,
): Promise<Either<RecurringError, RecurringTransaction>> {
  if (!validateRule(input)) return left("invalid_rule");
  const refError = await validateRefs(deps.db, actor.workspaceId, input);
  if (refError) return left(refError);

  const created = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(recurringTransactions)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning();
    if (!row) throw new Error("falha ao criar recorrência");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "recurring_transaction",
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}
