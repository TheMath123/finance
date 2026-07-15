import { left, right, type Either } from "@finance/shared";
import type { Actor, UseCaseDeps } from "../../deps";
import type { BankError } from "./errors";

/** Banco com contas/cartões não é deletável — arquiva (regra do spec). */
export async function deleteBank(
  deps: UseCaseDeps,
  actor: Actor,
  bankId: string,
): Promise<Either<BankError, null>> {
  const existing = await deps.repos.bank.findInWorkspace(actor.workspaceId, bankId);
  if (!existing) return left("bank_not_found");

  const [hasAccount, hasCard] = await Promise.all([
    deps.repos.account.existsByBank(bankId),
    deps.repos.card.existsByBank(bankId),
  ]);
  if (hasAccount || hasCard) return left("bank_in_use");

  await deps.uow.run(async (repos) => {
    await repos.bank.delete(bankId);
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "delete",
      entity: "bank",
      entityId: bankId,
    });
  });
  return right(null);
}
