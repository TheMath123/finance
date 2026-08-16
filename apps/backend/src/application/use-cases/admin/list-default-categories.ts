import type { UseCaseDeps } from '../../deps';
import type { DefaultCategory } from '../../ports/default-category-repository';

export function listDefaultCategories(
  deps: Pick<UseCaseDeps, 'repos'>,
  search?: string
): Promise<DefaultCategory[]> {
  return deps.repos.defaultCategory.list(search);
}
