import { isValidBankCode, left, right, type Either } from "@finance/shared";
import type { Bank } from "../../../domain/entities/bank";
import type { Actor, UseCaseDeps } from "../../deps";
import type { BankError } from "./errors";

export interface UpdateBankInput {
  name?: string;
  bankCode?: string;
}

export async function updateBank(
  deps: UseCaseDeps,
  actor: Actor,
  bankId: string,
  input: UpdateBankInput,
): Promise<Either<BankError, Bank>> {
  if (input.bankCode && !isValidBankCode(input.bankCode)) return left("invalid_bank_code");
  const existing = await deps.repos.bank.findInWorkspace(actor.workspaceId, bankId);
  if (!existing) return left("bank_not_found");

  const updated = await deps.uow.run(async (repos) => {
    const bank = await repos.bank.update(bankId, input);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "update",
      entity: "bank",
      entityId: bank.id,
    });
    return bank;
  });
  return right(updated);
}
