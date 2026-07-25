import type { UseCaseDeps } from '../../deps';
import type { DefaultCategory } from '../../ports/default-category-repository';

export function listDefaultCategories(
  deps: Pick<UseCaseDeps, 'repos'>
): Promise<DefaultCategory[]> {
  return deps.repos.defaultCategory.list();
}
