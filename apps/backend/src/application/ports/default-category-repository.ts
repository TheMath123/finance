export interface DefaultCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefaultCategoryInput {
  name: string;
  icon: string;
  color: string;
  isFallback: boolean;
}

export interface DefaultCategoryRepository {
  list(search?: string): Promise<DefaultCategory[]>;
  create(data: DefaultCategoryInput): Promise<DefaultCategory>;
  update(
    id: string,
    patch: Partial<DefaultCategoryInput>
  ): Promise<DefaultCategory>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<DefaultCategory | undefined>;
}
