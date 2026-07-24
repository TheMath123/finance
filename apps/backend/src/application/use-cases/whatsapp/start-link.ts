import { type Either, left, right } from '@finance/shared';
import { WHATSAPP_LINK_TTL_MS } from '../../../infra/security/jose-token-service';
import type { UseCaseDeps } from '../../deps';
import type { WhatsAppLinkError } from './errors';

export interface StartWhatsAppLinkOutput {
  code: string;
  expiresAt: Date;
}

/**
 * Inicia o vínculo do WhatsApp (autenticado, spec: "nasce no app"). Gera o
 * código de 6 dígitos exibido no app — o usuário o envia por WhatsApp e o
 * webhook (M2-06) chama `confirmWhatsAppLink` com o número remetente.
 */
export async function startWhatsAppLink(
  deps: Pick<UseCaseDeps, 'repos' | 'rateLimiter' | 'tokens'>,
  userId: string
): Promise<Either<WhatsAppLinkError, StartWhatsAppLinkOutput>> {
  if (
    await deps.rateLimiter.isLimited(
      `whatsapp-link-start:${userId}`,
      3,
      15 * 60_000
    )
  ) {
    return left('rate_limited');
  }

  // Gerar novo código invalida os anteriores não usados (mesmo padrão do reset de senha).
  await deps.repos.whatsappLinkCode.deleteUnusedByUser(userId);

  const generated = deps.tokens.generateCode();
  const expiresAt = new Date(Date.now() + WHATSAPP_LINK_TTL_MS);
  await deps.repos.whatsappLinkCode.create({
    userId,
    codeHash: generated.hash,
    expiresAt,
  });

  return right({ code: generated.raw, expiresAt });
}
