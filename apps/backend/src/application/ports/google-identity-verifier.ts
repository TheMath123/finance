/**
 * Porta pra validar um ID token do Google (login social) — nenhum tipo do
 * `google-auth-library` vaza pra camada de aplicação, mesmo princípio de toda
 * porta já existente (ver PaymentGateway). `verifyIdToken` retorna `null` em
 * qualquer falha de verificação (assinatura, audience, expiração) — nunca
 * lança, pra manter o use-case livre de try/catch de infra.
 */
export interface GoogleIdentityVerifier {
  verifyIdToken(idToken: string): Promise<GoogleIdentity | null>;
}

export interface GoogleIdentity {
  /** Claim `sub` — identificador estável da conta Google, nunca muda (ao contrário do e-mail). */
  sub: string;
  email: string;
  /** Google só marca `true` quando verificou a posse do e-mail de verdade — nunca confiar em e-mail com isso `false`. */
  emailVerified: boolean;
  name: string;
}
