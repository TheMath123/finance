/**
 * Log estruturado (JSON) sem dados sensíveis — spec: Observabilidade.
 * Eventos de segurança (rate limit, lockout) são o sinal de ataque em andamento.
 */
export function securityLog(
  event:
    | "rate_limited"
    | "account_locked"
    | "login_failed"
    | "forgot_password_throttled"
    | "invalid_token",
  data: Record<string, string | number | boolean | null> = {},
): void {
  console.warn(JSON.stringify({ level: "warn", scope: "security", event, ...data, ts: new Date().toISOString() }));
}
