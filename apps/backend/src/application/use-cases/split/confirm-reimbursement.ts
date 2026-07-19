import { left, right, type Either } from "@finance/shared";
import type { SplitShare } from "../../../domain/entities/expense-split";
import { normalizeDescription } from "../../../domain/services/occurrence-rules";
import type { UseCaseDeps } from "../../deps";
import { createNotification } from "../notification/create-notification";
import type { SplitError } from "./errors";

function todayCompetence(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Criador confirma "recebi": participante-usuário precisa ter marcado
 * `paid` antes (dois lados); participante externo pula direto de `pending`
 * pra `confirmed` — não tem conta pra marcar "paguei" (spec). Gera a
 * transação de reembolso (entrada) na mesma conta da despesa original —
 * nunca mexe na transação original.
 */
export async function confirmShareReimbursement(
  deps: Pick<UseCaseDeps, "repos" | "uow" | "dispatch">,
  actor: { userId: string },
  shareId: string,
): Promise<Either<SplitError, SplitShare>> {
  const share = await deps.repos.splitShare.findById(shareId);
  if (!share) return left("share_not_found");

  const split = await deps.repos.expenseSplit.findById(share.splitId);
  if (!split || split.cancelledAt) return left("split_not_found");
  if (split.createdBy !== actor.userId) return left("not_creator");

  const requiredStatus = share.participantUserId ? "paid" : "pending";
  if (share.status !== requiredStatus) return left("invalid_transition");

  const transaction = await deps.repos.transaction.findById(split.transactionId);
  if (!transaction || !transaction.accountId) throw new Error("transação do split inválida");

  const category = await deps.repos.category.findFallback(transaction.workspaceId);
  if (!category) throw new Error("workspace sem categoria fallback");

  const participantName =
    share.participantName ??
    (share.participantUserId ? (await deps.repos.user.findById(share.participantUserId))?.name : undefined) ??
    "participante";

  const updated = await deps.uow.run(async (repos) => {
    const description = `Reembolso de ${participantName} — ${transaction.description}`;
    const reimbursement = await repos.transaction.create({
      workspaceId: transaction.workspaceId,
      createdBy: actor.userId,
      description,
      descriptionNormalized: normalizeDescription(description),
      amount: share.amount,
      type: "income",
      method: "pix",
      date: todayCompetence(),
      categoryId: category.id,
      accountId: transaction.accountId!,
      source: "app",
    });
    return repos.splitShare.updateStatus(shareId, "confirmed", reimbursement.id);
  });

  if (share.participantUserId) {
    await createNotification(deps, {
      userId: share.participantUserId,
      type: "split_reimbursement_confirmed",
      title: "Reembolso confirmado",
      body: `Seu pagamento de "${transaction.description}" foi confirmado.`,
      data: { splitId: split.id, shareId },
    });
  }

  return right(updated);
}
