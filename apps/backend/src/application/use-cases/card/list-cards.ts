import type { Card } from "../../../domain/entities/card";
import type { Actor, UseCaseDeps } from "../../deps";

export interface CardWithLimit extends Card {
  /** limit − Σ(faturas não pagas) — derivado (regra do spec). */
  availableLimit: number;
}

export async function listCards(deps: UseCaseDeps, actor: Actor): Promise<CardWithLimit[]> {
  const cards = await deps.repos.card.listByWorkspace(actor.workspaceId);
  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      availableLimit: card.limit - (await deps.repos.invoice.unpaidTotalByCard(card.id)),
    })),
  );
}
