import { eq } from "drizzle-orm";
import { cardInvoices, cards, transactions } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { CardError } from "../errors";
import { findWorkspaceCard } from "./shared";

export async function deleteCard(
  deps: DbDeps,
  actor: Actor,
  cardId: string,
): Promise<Either<CardError, null>> {
  const existing = await findWorkspaceCard(deps.db, actor.workspaceId, cardId);
  if (!existing) return left("card_not_found");

  const hasTransaction = await deps.db.query.transactions.findFirst({
    where: eq(transactions.cardId, cardId),
  });
  if (hasTransaction) return left("card_has_transactions");

  await deps.db.transaction(async (tx) => {
    await tx.delete(cardInvoices).where(eq(cardInvoices.cardId, cardId));
    await tx.delete(cards).where(eq(cards.id, cardId));
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "card",
      entityId: cardId,
    });
  });
  return right(null);
}
