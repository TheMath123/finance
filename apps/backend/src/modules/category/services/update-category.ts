import { eq } from "drizzle-orm";
import { categories, type Category } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { UpdateCategoryInput } from "../schemas";
import type { CategoryError } from "../errors";
import { findWorkspaceCategory } from "./shared";

export async function updateCategory(
  deps: DbDeps,
  actor: Actor,
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<Either<CategoryError, Category>> {
  const existing = await findWorkspaceCategory(deps.db, actor.workspaceId, categoryId);
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
