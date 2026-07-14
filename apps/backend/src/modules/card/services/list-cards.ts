import { eq } from "drizzle-orm";
import { cards, type Card } from "@finance/db";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { unpaidInvoicesTotal } from "../../../lib/invoices";

export interface CardWithLimit extends Card {
  /** limit − Σ(faturas não pagas) — derivado (regra do spec). */
  availableLimit: number;
}

export async function listCards(deps: DbDeps, actor: Actor): Promise<CardWithLimit[]> {
  const rows = await deps.db.query.cards.findMany({
    where: eq(cards.workspaceId, actor.workspaceId),
  });
  return Promise.all(
    rows.map(async (card) => ({
      ...card,
      availableLimit: card.limit - (await unpaidInvoicesTotal(deps.db, card.id)),
    })),
  );
}
