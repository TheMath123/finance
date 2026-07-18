/** Cache genérico com TTL — usado por cálculos caros demais pra rodar a cada request (M2-08). */
export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}
