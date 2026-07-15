import { left, right, type Either } from "@finance/shared";
import type { Bank } from "../../../domain/entities/bank";
import type { Actor, UseCaseDeps } from "../../deps";
import type { BankError } from "./errors";

export async function archiveBank(
  deps: UseCaseDeps,
  actor: Actor,
  bankId: string,
  archived: boolean,
): Promise<Either<BankError, Bank>> {
  const existing = await deps.repos.bank.findInWorkspace(actor.workspaceId, bankId);
  if (!existing) return left("bank_not_found");

  const updated = await deps.uow.run(async (repos) => {
    const bank = await repos.bank.setArchived(bankId, archived);
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
