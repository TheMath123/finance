import type { WhatsAppLinkCode } from "../../domain/entities/whatsapp-link-code";

export interface WhatsAppLinkCodeRepository {
  create(data: { userId: string; codeHash: string; expiresAt: Date }): Promise<WhatsAppLinkCode>;
  /**
   * Não usado e não expirado, por hash — sem escopo de usuário: o remetente só é
   * conhecido depois de achar a linha (é o próprio dado sendo vinculado). Proteção
   * de força bruta fica no rate limit por telefone (ver `confirm-link.ts`).
   */
  findValidByHash(codeHash: string): Promise<WhatsAppLinkCode | undefined>;
  markUsed(id: string): Promise<void>;
  deleteUnusedByUser(userId: string): Promise<void>;
}
