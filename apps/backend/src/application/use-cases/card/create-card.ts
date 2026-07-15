import { left, right, type Either } from "@finance/shared";
import type { Card } from "../../../domain/entities/card";
import type { Actor, UseCaseDeps } from "../../deps";
import type { CardError } from "./errors";

export interface CreateCardInput {
  name: string;
  bankId: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

export async function createCard(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateCardInput,
): Promise<Either<CardError, Card>> {
  const bank = await deps.repos.bank.findInWorkspace(actor.workspaceId, input.bankId);
  if (!bank) return left("bank_not_found");

  const created = await deps.uow.run(async (repos) => {
    const card = await repos.card.create(actor.workspaceId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "card",
      entityId: card.id,
    });
    return card;
  });
  return right(created);
}
