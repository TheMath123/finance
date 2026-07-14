/**
 * Rate limiting em memória (janela deslizante) — camada por IP e por usuário do M1.
 * Instância única; no M2 migra para Redis atrás desta mesma interface (spec: Rate limiting).
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

/**
 * IP do cliente: X-Forwarded-For só é confiável atrás do proxy do provedor
 * (TRUST_PROXY=true); caso contrário, IP do socket — evita spoof da chave de limite.
 */
export function getClientIp(
  request: Request,
  server: { requestIP(req: Request): { address: string } | null } | null | undefined,
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  return server?.requestIP(request)?.address ?? "unknown";
}

/** Exposto para os testes limparem o estado entre casos. */
export function resetRateLimits(): void {
  buckets.clear();
}
