/** Janela deslizante — camadas de rate limiting do spec (IP, identidade-alvo, usuário). */
export interface RateLimiter {
  isLimited(key: string, max: number, windowMs: number): Promise<boolean>;
}
