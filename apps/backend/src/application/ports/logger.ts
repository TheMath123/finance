export type SecurityEvent =
  | 'rate_limited'
  | 'account_locked'
  | 'login_failed'
  | 'forgot_password_throttled'
  | 'invalid_token';

/** Log estruturado de eventos de segurança — o sinal de ataque em andamento (spec). */
export interface SecurityLogger {
  log(
    event: SecurityEvent,
    data?: Record<string, string | number | boolean | null>
  ): void;
}
