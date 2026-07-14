import { banks, type Bank } from "@finance/db";
import { isValidBankCode, left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../../lib/audit";
import type { DbDeps } from "../../../lib/deps";
import type { Actor } from "../../../lib/http";
import type { CreateBankInput } from "../schemas";
import type { BankError } from "../errors";

export async function createBank(
  deps: DbDeps,
  actor: Actor,
  input: CreateBankInput,
): Promise<Either<BankError, Bank>> {
  if (!isValidBankCode(input.bankCode)) return left("invalid_bank_code");

  const created = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(banks)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning();
    if (!row) throw new Error("falha ao criar banco");
    await recordAudit(tx, {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "bank",
      entityId: row.id,
    });
    return row;
  });
  return right(created);
}
