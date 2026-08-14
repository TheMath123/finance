import type {
  GoogleIdentity,
  GoogleIdentityVerifier,
} from '../../application/ports/google-identity-verifier';

/**
 * Fake pra testes — nunca chama rede. `responses` mapeia um idToken de
 * mentira (qualquer string escolhida no teste) pro `GoogleIdentity` que ele
 * deve "verificar" como; um idToken ausente do mapa vira `null` (token
 * inválido), mesmo comportamento da implementação real pra assinatura ruim.
 */
export function createFakeGoogleIdentityVerifier(
  responses: Map<string, GoogleIdentity | null>
): GoogleIdentityVerifier {
  return {
    async verifyIdToken(idToken: string): Promise<GoogleIdentity | null> {
      return responses.get(idToken) ?? null;
    },
  };
}
