import { cards, type Card } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import { findWorkspaceBank } from "../../bank/services/shared";
import type { CreateCardInput } from "../schemas";
import type { CardError } from "../errors";

export async function createCard(
  deps: DbDeps,
  actor: Actor,
  input: CreateCardInput,
): Promise<Either<CardError, Card>> {
  const bank = await findWorkspaceBank(deps.db, actor.workspaceId, input.bankId);
  if (!bank) return left("bank_not_found");

  const created = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(cards)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning();
    if (!row) throw new Error("falha ao criar cartão");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "card",
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}
