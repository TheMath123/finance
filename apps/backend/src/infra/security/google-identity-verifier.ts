import { OAuth2Client } from 'google-auth-library';
import type {
  GoogleIdentity,
  GoogleIdentityVerifier,
} from '../../application/ports/google-identity-verifier';

/**
 * `OAuth2Client` sem client id/secret construtor — só usamos `verifyIdToken`,
 * que não precisa de credenciais próprias (valida a assinatura contra a chave
 * pública do Google, cacheada internamente pela lib). `audience` é a lista de
 * Client IDs aceitos (web +, na Fase 2, iOS/Android) — um ID token só passa
 * se o `aud` dele bater com um desses.
 */
export function createGoogleIdentityVerifier(
  allowedClientIds: string[]
): GoogleIdentityVerifier {
  const client = new OAuth2Client();

  return {
    async verifyIdToken(idToken: string): Promise<GoogleIdentity | null> {
      try {
        const ticket = await client.verifyIdToken({
          idToken,
          audience: allowedClientIds,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) return null;

        return {
          sub: payload.sub,
          email: payload.email,
          emailVerified: payload.email_verified ?? false,
          name: payload.name ?? payload.email,
        };
      } catch {
        // Assinatura inválida, audience errado, token expirado etc. — tudo
        // vira "token inválido" pro use-case, sem distinção (mesmo espírito
        // de verifyAccess do jose-token-service.ts).
        return null;
      }
    },
  };
}
