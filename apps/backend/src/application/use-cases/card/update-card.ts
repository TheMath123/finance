import { left, right, type Either } from "@finance/shared";
import type { Card } from "../../../domain/entities/card";
import type { Actor, UseCaseDeps } from "../../deps";
import { findOrCreateBank } from "../bank/find-or-create-bank";
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

  const updated = await deps.uow.run(async (repos) => {
    let bankId: string | undefined;
    if (input.bankCode) {
      const bank = await findOrCreateBank(repos, actor.workspaceId, input.bankCode);
      if (!bank.ok) return bank;
      bankId = bank.value.id;
    }

    const card = await repos.card.update(cardId, {
      name: input.name,
      bankId,
      limit: input.limit,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "card",
      entityId: card.id,
    });
    return right(card);
  });
  if (!updated.ok) return left("invalid_bank_code");
  return updated;
}
