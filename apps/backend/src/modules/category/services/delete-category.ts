import { and, eq } from "drizzle-orm";
import { categories, transactions } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { CategoryError } from "../errors";
import { findWorkspaceCategory } from "./shared";

/**
 * Exclusão de categoria em uso: transações são reatribuídas para "Outros"
 * (fallback do seed, não-deletável) — regra do spec.
 */
export async function deleteCategory(
  deps: DbDeps,
  actor: Actor,
  categoryId: string,
): Promise<Either<CategoryError, { reassignedTo: string }>> {
  const existing = await findWorkspaceCategory(deps.db, actor.workspaceId, categoryId);
  if (!existing) return left("category_not_found");
  if (existing.isFallback) return left("fallback_not_deletable");

  const fallback = await deps.db.query.categories.findFirst({
    where: and(eq(categories.workspaceId, actor.workspaceId), eq(categories.isFallback, true)),
  });
  if (!fallback) throw new Error("workspace sem categoria fallback");

  await deps.db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ categoryId: fallback.id })
      .where(eq(transactions.categoryId, categoryId));
    await tx.delete(categories).where(eq(categories.id, categoryId));
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "category",
      entityId: categoryId,
    });
  });
  return right({ reassignedTo: fallback.id });
}
