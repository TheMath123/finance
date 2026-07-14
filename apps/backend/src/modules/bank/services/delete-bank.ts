import { eq } from "drizzle-orm";
import { bankAccounts, banks, cards } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { BankError } from "../errors";
import { findWorkspaceBank } from "./shared";

/** Banco com contas/cartões não é deletável — arquiva (regra do spec). */
export async function deleteBank(
  deps: DbDeps,
  actor: Actor,
  bankId: string,
): Promise<Either<BankError, null>> {
  const existing = await findWorkspaceBank(deps.db, actor.workspaceId, bankId);
  if (!existing) return left("bank_not_found");

  const [account, card] = await Promise.all([
    deps.db.query.bankAccounts.findFirst({ where: eq(bankAccounts.bankId, bankId) }),
    deps.db.query.cards.findFirst({ where: eq(cards.bankId, bankId) }),
  ]);
  if (account || card) return left("bank_in_use");

  await deps.db.transaction(async (tx) => {
    await tx.delete(banks).where(eq(banks.id, bankId));
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "bank",
      entityId: bankId,
    });
  });
  return right(null);
}
