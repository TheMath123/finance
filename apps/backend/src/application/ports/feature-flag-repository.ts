export interface FeatureFlag {
  id: string;
  key: string;
  /** Nome legível pra exibição na UI (ex.: "Chatbot de IA no WhatsApp") — só o seed decide, nunca editável via API. */
  title: string;
  enabled: boolean;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tipo de ESCRITA usado pelo `upsert` — nunca inclui `isSystem`/`title` de
 * propósito: é proteção estrutural, a rota PUT /admin/feature-flags/:key
 * nunca consegue setar/alterar esses campos via API. Só o seed (migration)
 * decide quem é `isSystem` e qual é o `title`.
 */
export interface FeatureFlagInput {
  enabled: boolean;
  description?: string | null;
}

export interface FeatureFlagRepository {
  /** `search` filtra por título/descrição/key via full-text search (nunca ILIKE). */
  list(search?: string): Promise<FeatureFlag[]>;
  findByKey(key: string): Promise<FeatureFlag | undefined>;
  /** Cria se `key` não existir, atualiza se existir. */
  upsert(key: string, data: FeatureFlagInput): Promise<FeatureFlag>;
}
