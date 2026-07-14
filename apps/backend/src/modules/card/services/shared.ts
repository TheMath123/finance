import { and, eq } from "drizzle-orm";
import { cards, type Card, type CardInvoice, type Db } from "@finance/db";
import type { InvoiceStatus } from "@finance/shared";

export async function findWorkspaceCard(
  db: Db,
  workspaceId: string,
  cardId: string,
): Promise<Card | undefined> {
  return db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.workspaceId, workspaceId)),
  });
}

export interface InvoiceView extends CardInvoice {
  total: number;
  effectiveStatus: InvoiceStatus;
}
