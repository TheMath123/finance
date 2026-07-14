import { eq } from "drizzle-orm";
import { cards, type Card } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { findWorkspaceBank } from "../../bank/services/shared";
import type { UpdateCardInput } from "../schemas";
import type { CardError } from "../errors";
import { findWorkspaceCard } from "./shared";

export async function updateCard(
  deps: DbDeps,
  actor: Actor,
  cardId: string,
  input: UpdateCardInput,
): Promise<Either<CardError, Card>> {
  const existing = await findWorkspaceCard(deps.db, actor.workspaceId, cardId);
  if (!existing) return left("card_not_found");
  if (input.bankId) {
    const bank = await findWorkspaceBank(deps.db, actor.workspaceId, input.bankId);
    if (!bank) return left("bank_not_found");
  }

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx.update(cards).set(input).where(eq(cards.id, cardId)).returning();
    if (!row) throw new Error("falha ao atualizar cartão");
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
