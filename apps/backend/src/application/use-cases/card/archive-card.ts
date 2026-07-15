import { left, right, type Either } from "@finance/shared";
import type { Card } from "../../../domain/entities/card";
import type { Actor, UseCaseDeps } from "../../deps";
import type { CardError } from "./errors";

/** Cartão com transações não é deletável — arquiva (regra do spec). */
export async function archiveCard(
  deps: UseCaseDeps,
  actor: Actor,
  cardId: string,
  archived: boolean,
): Promise<Either<CardError, Card>> {
  const existing = await deps.repos.card.findInWorkspace(actor.workspaceId, cardId);
  if (!existing) return left("card_not_found");

  const updated = await deps.uow.run(async (repos) => {
    const card = await repos.card.setArchived(cardId, archived);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "card",
      entityId: card.id,
    });
    return card;
  });
  return right(updated);
}
