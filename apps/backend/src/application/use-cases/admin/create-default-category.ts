import { type Either, right } from '@finance/shared';
import type { UseCaseDeps } from '../../deps';
import type {
  DefaultCategory,
  DefaultCategoryInput,
} from '../../ports/default-category-repository';
import type { AdminError } from './errors';

/**
 * Invariante: no máximo uma categoria padrão com `isFallback: true` — é ela
 * que vira a fallback (não-deletável) de todo workspace novo. Marcar uma
 * nova como fallback desmarca a anterior. Tudo numa transação — se a
 * auditoria falhar, a categoria não fica órfã.
 */
export async function createDefaultCategory(
  deps: Pick<UseCaseDeps, 'repos' | 'uow'>,
  adminUserId: string,
  input: DefaultCategoryInput
): Promise<Either<AdminError, DefaultCategory>> {
  const created = await deps.uow.run(async (repos) => {
    if (input.isFallback) {
      const existing = await repos.defaultCategory.list();
      await Promise.all(
        existing
          .filter((c) => c.isFallback)
          .map((c) => repos.defaultCategory.update(c.id, { isFallback: false }))
      );
    }

    const created = await repos.defaultCategory.create(input);
    await repos.adminAudit.record({
      adminUserId,
      action: 'create_default_category',
      entity: 'default_category',
      entityId: created.id,
    });
    return created;
  });

  return right(created);
}
