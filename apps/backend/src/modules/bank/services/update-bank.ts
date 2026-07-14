import { eq } from "drizzle-orm";
import { banks, type Bank } from "@finance/db";
import { isValidBankCode, left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { UpdateBankInput } from "../schemas";
import type { BankError } from "../errors";
import { findWorkspaceBank } from "./shared";

export async function updateBank(
  deps: DbDeps,
  actor: Actor,
  bankId: string,
  input: UpdateBankInput,
): Promise<Either<BankError, Bank>> {
  if (input.bankCode && !isValidBankCode(input.bankCode)) return left("invalid_bank_code");
  const existing = await findWorkspaceBank(deps.db, actor.workspaceId, bankId);
  if (!existing) return left("bank_not_found");

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx.update(banks).set(input).where(eq(banks.id, bankId)).returning();
    if (!row) throw new Error("falha ao atualizar banco");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "bank",
      entityId: row.id,
    });
    return row;
  });
  return right(updated);
}
