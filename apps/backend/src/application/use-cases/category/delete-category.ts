import { left, right, type Either } from "@finance/shared";
import type { Actor, UseCaseDeps } from "../../deps";
import type { CategoryError } from "./errors";

/**
 * Exclusão de categoria em uso: transações são reatribuídas para "Outros"
 * (fallback do seed, não-deletável) — regra do spec.
 */
export async function deleteCategory(
  deps: UseCaseDeps,
  actor: Actor,
  categoryId: string,
): Promise<Either<CategoryError, { reassignedTo: string }>> {
  const existing = await deps.repos.category.findInWorkspace(actor.workspaceId, categoryId);
  if (!existing) return left("category_not_found");
  if (existing.isFallback) return left("fallback_not_deletable");

  const fallback = await deps.repos.category.findFallback(actor.workspaceId);
  if (!fallback) throw new Error("workspace sem categoria fallback");

  await deps.uow.run(async (repos) => {
    await repos.transaction.reassignCategory(categoryId, fallback.id);
    await repos.category.delete(categoryId);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "category",
      entityId: categoryId,
    });
  });
  return right({ reassignedTo: fallback.id });
}
