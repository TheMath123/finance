import { categories, type Category } from "@finance/db";
import { right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { CreateCategoryInput } from "../schemas";
import type { CategoryError } from "../errors";

export async function createCategory(
  deps: DbDeps,
  actor: Actor,
  input: CreateCategoryInput,
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
