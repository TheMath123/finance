import { eq } from "drizzle-orm";
import { cards, type Card } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { CardError } from "../errors";
import { findWorkspaceCard } from "./shared";

/** Cartão com transações não é deletável — arquiva (regra do spec). */
export async function archiveCard(
  deps: DbDeps,
  actor: Actor,
  cardId: string,
  archived: boolean,
): Promise<Either<CardError, Card>> {
  const existing = await findWorkspaceCard(deps.db, actor.workspaceId, cardId);
  if (!existing) return left("card_not_found");

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(cards)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(cards.id, cardId))
      .returning();
    if (!row) throw new Error("falha ao arquivar cartão");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "card",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}
