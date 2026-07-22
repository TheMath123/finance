import { left, right, type Either } from "@finance/shared";
import type { InterUserTransfer } from "../../../domain/entities/inter-user-transfer";
import { normalizeDescription } from "../../../domain/services/occurrence-rules";
import type { UseCaseDeps } from "../../deps";
import { createNotification } from "../notification/create-notification";
import type { TransferError } from "./errors";

export interface AcceptTransferInput {
  transferId: string;
  /** Conta do destinatário — qualquer workspace em que ele é membro (o remetente nunca vê essa escolha). */
  accountId: string;
  /** Marca o remetente como contato confiável nessa conta (spec: próximas transferências dele entram automático). */
  markTrusted?: boolean;
}

function todayCompetence(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Sinaliza dentro do `uow.run` que o status mudou entre a leitura e o commit (corrida) — reverte a transação de entrada já criada. */
class AlreadyFinalizedError extends Error {}

export async function acceptTransfer(
  deps: Pick<UseCaseDeps, "repos" | "uow" | "dispatch" | "rateLimiter" | "notificationBus">,
  actor: { userId: string },
  input: AcceptTransferInput,
): Promise<Either<TransferError, InterUserTransfer>> {
  // Auditoria de segurança (2026-07-19): nenhuma rota monetária tinha rate limit própria.
  if (await deps.rateLimiter.isLimited(`transfer-accept:${actor.userId}`, 20, 60 * 60_000)) {
    return left("rate_limited");
  }

  const transfer = await deps.repos.interUserTransfer.findById(input.transferId);
  if (!transfer) return left("transfer_not_found");
  if (transfer.toUserId !== actor.userId) return left("not_recipient");
  if (transfer.status !== "pending") return left("already_finalized");

  const account = await deps.repos.account.findById(input.accountId);
  if (!account || account.archivedAt) return left("account_not_found");
  const role = await deps.repos.workspace.getMemberRole(account.workspaceId, actor.userId);
  if (!role) return left("account_not_found");

  const [sender, category] = await Promise.all([
    deps.repos.user.findById(transfer.fromUserId),
    deps.repos.category.findFallback(account.workspaceId),
  ]);
  if (!sender || !category) throw new Error("remetente ou categoria fallback ausente");

  let accepted: InterUserTransfer;
  try {
    accepted = await deps.uow.run(async (repos) => {
      const description = `Transferência recebida de ${sender.name}`;
      const toTx = await repos.transaction.create({
        workspaceId: account.workspaceId,
        createdBy: actor.userId,
        description,
        descriptionNormalized: normalizeDescription(description),
        amount: transfer.amount,
        type: "income",
        method: "pix",
        date: todayCompetence(),
        categoryId: category.id,
        accountId: account.id,
        source: "app",
      });
      // Auditoria de segurança (2026-07-19): UPDATE condicional (WHERE status='pending')
      // fecha a corrida de duas chamadas paralelas de accept (ou accept+reject) gerarem
      // duas transações de crédito — se outra chamada já finalizou primeiro, `result` vem
      // undefined e a transação de entrada acima é revertida junto (throw dentro do uow.run).
      const result = await repos.interUserTransfer.accept(transfer.id, toTx.id);
      if (!result) throw new AlreadyFinalizedError();
      if (input.markTrusted) {
        await repos.trustedContact.upsert(actor.userId, transfer.fromUserId, account.id);
      }
      return result;
    });
  } catch (error) {
    if (error instanceof AlreadyFinalizedError) return left("already_finalized");
    throw error;
  }

  await createNotification(deps, {
    userId: transfer.fromUserId,
    type: "transfer_accepted",
    title: "Transferência aceita",
    body: "Sua transferência foi aceita pelo destinatário.",
    data: { transferId: transfer.id },
  });

  return right(accepted);
}
