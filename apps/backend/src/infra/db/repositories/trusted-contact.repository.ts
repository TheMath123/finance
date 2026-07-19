import { and, eq } from "drizzle-orm";
import { trustedContacts } from "@finance/db";
import type { TrustedContactRepository } from "../../../application/ports/trusted-contact-repository";
import type { DbHandle } from "../handle";

export function createTrustedContactRepository(db: DbHandle): TrustedContactRepository {
  return {
    findByPair: (userId, trustedUserId) =>
      db.query.trustedContacts.findFirst({
        where: and(eq(trustedContacts.userId, userId), eq(trustedContacts.trustedUserId, trustedUserId)),
      }),
    listByUser: (userId) =>
      db.query.trustedContacts.findMany({ where: eq(trustedContacts.userId, userId) }),
    async upsert(userId, trustedUserId, defaultAccountId) {
      const [row] = await db
        .insert(trustedContacts)
        .values({ userId, trustedUserId, defaultAccountId })
        .onConflictDoUpdate({
          target: [trustedContacts.userId, trustedContacts.trustedUserId],
          set: { defaultAccountId },
        })
        .returning();
      if (!row) throw new Error("falha ao marcar contato confiável");
      return row;
    },
    async delete(id, userId) {
      await db.delete(trustedContacts).where(and(eq(trustedContacts.id, id), eq(trustedContacts.userId, userId)));
    },
  };
}
