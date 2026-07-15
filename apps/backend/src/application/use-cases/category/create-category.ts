import { right, type Either } from "@finance/shared";
import type { Category } from "../../../domain/entities/category";
import type { Actor, UseCaseDeps } from "../../deps";
import type { CategoryError } from "./errors";

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
}

export async function createCategory(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateCategoryInput,
): Promise<Either<CategoryError, Category>> {
  const created = await deps.uow.run(async (repos) => {
    const category = await repos.category.create(actor.workspaceId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "category",
      entityId: category.id,
    });
    return category;
  });
  return right(created);
}
