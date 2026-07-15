import { left, right, type Either } from "@finance/shared";
import type { Card } from "../../../domain/entities/card";
import type { Actor, UseCaseDeps } from "../../deps";
import { findOrCreateBank } from "../bank/find-or-create-bank";
import type { CardError } from "./errors";

export interface CreateCardInput {
  name: string;
  /** Código do catálogo (spec: usuário não cadastra banco manualmente — o banco é resolvido por trás). */
  bankCode: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

export async function createCard(
  deps: UseCaseDeps,
  actor: Actor,
  input: CreateCardInput,
): Promise<Either<CardError, Card>> {
  const created = await deps.uow.run(async (repos) => {
    const bank = await findOrCreateBank(repos, actor.workspaceId, input.bankCode);
    if (!bank.ok) return bank;

    const card = await repos.card.create(actor.workspaceId, {
      name: input.name,
      bankId: bank.value.id,
      limit: input.limit,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
    });
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "card",
      entityId: card.id,
    });
    return right(card);
  });
  if (!created.ok) return left("invalid_bank_code");
  return created;
}
