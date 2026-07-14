/**
 * Rate limiting em memória (janela deslizante simples) para o auth — spec: força bruta.
 * Suficiente para instância única do M1; com múltiplas instâncias, migrar para Redis (M2).
 */
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

/** Exposto para os testes limparem o estado entre casos. */
export function resetRateLimits(): void {
  buckets.clear();
}
