import { and, eq } from "drizzle-orm";
import { bankAccounts, banks, cards, type Bank, type Db } from "@finance/db";
import { isValidBankCode, left, right, type Either } from "@finance/shared";
import { recordAudit } from "../../lib/audit";
import type { Actor } from "../../lib/http";

export type BankError = "bank_not_found" | "invalid_bank_code" | "bank_in_use";

export interface BankDeps {
  db: Db;
}

export async function createBank(
  deps: BankDeps,
  actor: Actor,
  input: { name: string; bankCode: string },
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

export async function listBanks(deps: BankDeps, actor: Actor): Promise<Bank[]> {
  return deps.db.query.banks.findMany({ where: eq(banks.workspaceId, actor.workspaceId) });
}

export async function updateBank(
  deps: BankDeps,
  actor: Actor,
  bankId: string,
  input: { name?: string; bankCode?: string },
): Promise<Either<BankError, Bank>> {
  if (input.bankCode && !isValidBankCode(input.bankCode)) return left("invalid_bank_code");
  const existing = await deps.db.query.banks.findFirst({
    where: and(eq(banks.id, bankId), eq(banks.workspaceId, actor.workspaceId)),
  });
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

export async function archiveBank(
  deps: BankDeps,
  actor: Actor,
  bankId: string,
  archived: boolean,
): Promise<Either<BankError, Bank>> {
  const existing = await deps.db.query.banks.findFirst({
    where: and(eq(banks.id, bankId), eq(banks.workspaceId, actor.workspaceId)),
  });
  if (!existing) return left("bank_not_found");

  const updated = await deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(banks)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(banks.id, bankId))
      .returning();
    if (!row) throw new Error("falha ao arquivar banco");
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

/** Banco com contas/cartões não é deletável — arquiva (regra do spec). */
export async function deleteBank(
  deps: BankDeps,
  actor: Actor,
  bankId: string,
): Promise<Either<BankError, null>> {
  const existing = await deps.db.query.banks.findFirst({
    where: and(eq(banks.id, bankId), eq(banks.workspaceId, actor.workspaceId)),
  });
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
