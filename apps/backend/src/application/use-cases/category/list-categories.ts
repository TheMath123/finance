import type { Category } from '../../../domain/entities/category';
import type { Actor, UseCaseDeps } from '../../deps';

export async function listCategories(
  deps: UseCaseDeps,
  actor: Actor
): Promise<Category[]> {
  return deps.repos.category.listByWorkspace(actor.workspaceId);
}
