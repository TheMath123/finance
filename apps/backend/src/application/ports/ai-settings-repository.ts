export interface AiSettings {
  id: string;
  dailyTokenBudgetPerUser: number;
  updatedAt: Date;
}

/** Singleton (uma única linha) — configurações globais de guardrail de IA (M4-09). */
export interface AiSettingsRepository {
  get(): Promise<AiSettings>;
  update(patch: { dailyTokenBudgetPerUser: number }): Promise<AiSettings>;
}
