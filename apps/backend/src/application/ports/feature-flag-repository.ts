export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagInput {
  enabled: boolean;
  description?: string | null;
}

export interface FeatureFlagRepository {
  list(): Promise<FeatureFlag[]>;
  findByKey(key: string): Promise<FeatureFlag | undefined>;
  /** Cria se `key` não existir, atualiza se existir. */
  upsert(key: string, data: FeatureFlagInput): Promise<FeatureFlag>;
  delete(key: string): Promise<void>;
}
