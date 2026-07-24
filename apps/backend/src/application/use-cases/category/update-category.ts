import { type Either, left, right } from '@finance/shared';
import type { Category } from '../../../domain/entities/category';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CreateCategoryInput } from './create-category';
import type { CategoryError } from './errors';

export async function updateCategory(
  deps: UseCaseDeps,
  actor: Actor,
  categoryId: string,
  input: Partial<CreateCategoryInput>
): Promise<Either<CategoryError, Category>> {
  const existing = await deps.repos.category.findInWorkspace(
    actor.workspaceId,
    categoryId
  );
  if (!existing) return left('category_not_found');
  if (existing.isFallback || existing.isDefault)
    return left('default_category_protected');

  const updated = await deps.uow.run(async (repos) => {
    const category = await repos.category.update(categoryId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: 'update',
      entity: 'category',
      entityId: category.id,
    });
    return category;
  });
  return right(updated);
}
