import { type Either, left, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type { AdminError } from './errors';

/** Nunca deleta a categoria fallback — teria que promover outra primeiro (update). */
export async function deleteDefaultCategory(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  categoryId: string
): Promise<Either<AdminError, void>> {
  const existing = await deps.repos.defaultCategory.findById(categoryId);
  if (!existing) return left('default_category_not_found');
  if (existing.isFallback) return left('cannot_delete_fallback_category');

  await deps.uow.run(async (repos) => {
    await repos.defaultCategory.delete(categoryId);
    await repos.adminAudit.record({
      adminUserId,
      action: 'delete_default_category',
      entity: 'default_category',
      entityId: categoryId,
    });
  });
  return right(undefined);
}
