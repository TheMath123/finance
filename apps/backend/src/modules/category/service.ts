import { and, eq } from "drizzle-orm";
import { categories, transactions, type Category, type Db } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../lib/audit";
import type { Actor } from "../../lib/http";

export type CategoryError = "category_not_found" | "fallback_not_deletable";

export interface CategoryDeps {
  db: Db;
}

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
}

export async function createCategory(
  deps: CategoryDeps,
  actor: Actor,
  input: CategoryInput,
): Promise<Either<CategoryError, Category>> {
  const created = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(categories)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning();
    if (!row) throw new Error("falha ao criar categoria");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "category",
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}

export async function listCategories(deps: CategoryDeps, actor: Actor): Promise<Category[]> {
  return deps.db.query.categories.findMany({
    where: eq(categories.workspaceId, actor.workspaceId),
  });
}

export async function updateCategory(
  deps: CategoryDeps,
  actor: Actor,
  categoryId: string,
  input: Partial<CategoryInput>,
): Promise<Either<CategoryError, Category>> {
  const existing = await deps.db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.workspaceId, actor.workspaceId)),
  });
  if (!existing) return left("category_not_found");

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(categories)
      .set(input)
      .where(eq(categories.id, categoryId))
      .returning();
    if (!row) throw new Error("falha ao atualizar categoria");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "category",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}

/**
 * Exclusão de categoria em uso: transações são reatribuídas para "Outros"
 * (fallback do seed, não-deletável) — regra do spec.
 */
export async function deleteCategory(
  deps: CategoryDeps,
  actor: Actor,
  categoryId: string,
): Promise<Either<CategoryError, { reassignedTo: string }>> {
  const existing = await deps.db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.workspaceId, actor.workspaceId)),
  });
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
