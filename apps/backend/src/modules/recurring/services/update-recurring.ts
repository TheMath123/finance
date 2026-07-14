import { eq } from "drizzle-orm";
import { recurringTransactions, type RecurringTransaction } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { RecurringInput, UpdateRecurringInput } from "../schemas";
import type { RecurringError } from "../errors";
import { findWorkspaceRecurring, validateRefs, validateRule } from "./shared";

export async function updateRecurring(
  deps: DbDeps,
  actor: Actor,
  recurringId: string,
  input: UpdateRecurringInput,
): Promise<Either<RecurringError, RecurringTransaction>> {
  const existing = await findWorkspaceRecurring(deps.db, actor.workspaceId, recurringId);
  if (!existing) return left("recurring_not_found");

  const merged = { ...existing, ...input };
  if (
    !validateRule({
      frequency: merged.frequency,
      dayOfReference: merged.dayOfReference,
      monthOfReference: merged.monthOfReference ?? undefined,
    })
  ) {
    return left("invalid_rule");
  }
  const refError = await validateRefs(deps.db, actor.workspaceId, {
    method: merged.method as RecurringInput["method"],
    categoryId: merged.categoryId,
    accountId: merged.accountId ?? undefined,
    cardId: merged.cardId ?? undefined,
  });
  if (refError) return left(refError);

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(recurringTransactions)
      .set(input)
      .where(eq(recurringTransactions.id, recurringId))
      .returning();
    if (!row) throw new Error("falha ao atualizar recorrência");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "recurring_transaction",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}
