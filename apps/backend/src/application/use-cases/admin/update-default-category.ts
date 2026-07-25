import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type {
  DefaultCategory,
  DefaultCategoryInput,
} from '../../ports/default-category-repository';
import type { AdminError } from './errors';

export async function updateDefaultCategory(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  categoryId: string,
  patch: Partial<DefaultCategoryInput>
): Promise<Either<AdminError, DefaultCategory>> {
  const existing = await deps.repos.defaultCategory.findById(categoryId);
  if (!existing) return left('default_category_not_found');

  const updated = await deps.uow.run(async (repos) => {
    if (patch.isFallback) {
      const others = await repos.defaultCategory.list();
      await Promise.all(
        others
          .filter((c) => c.isFallback && c.id !== categoryId)
          .map((c) => repos.defaultCategory.update(c.id, { isFallback: false }))
      );
    }

    const updated = await repos.defaultCategory.update(categoryId, patch);
    await repos.adminAudit.record({
      adminUserId,
      action: 'update_default_category',
      entity: 'default_category',
      entityId: categoryId,
    });
    return updated;
  });

  return right(updated);
}
