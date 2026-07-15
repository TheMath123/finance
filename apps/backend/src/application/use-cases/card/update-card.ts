import { left, right, type Either } from "@finance/shared";
import type { Card } from "../../../domain/entities/card";
import type { Actor, UseCaseDeps } from "../../deps";
import type { CardError } from "./errors";
import type { CreateCardInput } from "./create-card";

export async function updateCard(
  deps: UseCaseDeps,
  actor: Actor,
  cardId: string,
  input: Partial<CreateCardInput>,
): Promise<Either<CardError, Card>> {
  const existing = await deps.repos.card.findInWorkspace(actor.workspaceId, cardId);
  if (!existing) return left("card_not_found");
  if (input.bankId) {
    const bank = await deps.repos.bank.findInWorkspace(actor.workspaceId, input.bankId);
    if (!bank) return left("bank_not_found");
  }

  const updated = await deps.uow.run(async (repos) => {
    const card = await repos.card.update(cardId, input);
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
