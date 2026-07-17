import { and, eq, gt, isNull } from "drizzle-orm";
import { whatsappLinkCodes } from "@finance/db";
import type { WhatsAppLinkCodeRepository } from "../../../application/ports/whatsapp-link-code-repository";
import type { DbHandle } from "../handle";

export function createWhatsAppLinkCodeRepository(db: DbHandle): WhatsAppLinkCodeRepository {
  return {
    async create(data) {
      const [row] = await db.insert(whatsappLinkCodes).values(data).returning();
      if (!row) throw new Error("falha ao criar código de vínculo do WhatsApp");
      return row;
    },
    findValidByHash: (codeHash) =>
      db.query.whatsappLinkCodes.findFirst({
        where: and(
          eq(whatsappLinkCodes.codeHash, codeHash),
          isNull(whatsappLinkCodes.usedAt),
          gt(whatsappLinkCodes.expiresAt, new Date()),
        ),
      }),
    async markUsed(id) {
      await db.update(whatsappLinkCodes).set({ usedAt: new Date() }).where(eq(whatsappLinkCodes.id, id));
    },
    async deleteUnusedByUser(userId) {
      await db
        .delete(whatsappLinkCodes)
        .where(and(eq(whatsappLinkCodes.userId, userId), isNull(whatsappLinkCodes.usedAt)));
    },
  };
}
