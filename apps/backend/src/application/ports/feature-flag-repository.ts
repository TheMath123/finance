export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tipo de ESCRITA usado pelo `upsert` — nunca inclui `isSystem` de propósito:
 * é proteção estrutural, a rota PUT /admin/feature-flags/:key nunca consegue
 * setar/alterar esse campo via API. Só o seed (migration) decide quem é
 * `isSystem`.
 */
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
