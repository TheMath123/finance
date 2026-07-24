/**
 * IP do cliente: X-Forwarded-For só é confiável atrás do proxy do provedor
 * (TRUST_PROXY=true); caso contrário, IP do socket — evita spoof da chave de limite.
 */
export function getClientIp(
  request: Request,
  server:
    | { requestIP(req: Request): { address: string } | null }
    | null
    | undefined,
  trustProxy: boolean
): string {
  if (trustProxy) {
    const forwarded = request.headers
      .get('x-forwarded-for')
      ?.split(',')[0]
      ?.trim();
    if (forwarded) return forwarded;
  }
  return server?.requestIP(request)?.address ?? 'unknown';
}
