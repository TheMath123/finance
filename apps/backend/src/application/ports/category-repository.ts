import type { Category } from "../../domain/entities/category";

export interface CategorySeed {
  name: string;
  icon: string;
  color: string;
  isFallback: boolean;
}

export interface CategoryRepository {
  create(workspaceId: string, data: Omit<CategorySeed, "isFallback">): Promise<Category>;
  createMany(workspaceId: string, data: CategorySeed[]): Promise<Category[]>;
  findInWorkspace(workspaceId: string, categoryId: string): Promise<Category | undefined>;
  listByWorkspace(workspaceId: string): Promise<Category[]>;
  update(categoryId: string, patch: Partial<Omit<CategorySeed, "isFallback">>): Promise<Category>;
  delete(categoryId: string): Promise<void>;
  findFallback(workspaceId: string): Promise<Category | undefined>;
}
