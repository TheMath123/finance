import { left, right, type Either } from "@finance/shared";
import type { SplitShare } from "../../../domain/entities/expense-split";
import type { UseCaseDeps } from "../../deps";
import { createNotification } from "../notification/create-notification";
import type { SplitError } from "./errors";

/** Só o próprio participante (com conta) marca "paguei" — externo não passa por aqui. */
export async function markSharePaid(
  deps: Pick<UseCaseDeps, "repos" | "rateLimiter" | "dispatch" | "notificationBus">,
  actor: { userId: string },
  shareId: string,
): Promise<Either<SplitError, SplitShare>> {
  // Auditoria de segurança (2026-07-19): nenhuma rota monetária tinha rate limit própria.
  if (await deps.rateLimiter.isLimited(`split-mark-paid:${actor.userId}`, 30, 60 * 60_000)) {
    return left("rate_limited");
  }

  const share = await deps.repos.splitShare.findById(shareId);
  if (!share) return left("share_not_found");
  if (share.participantUserId !== actor.userId) return left("not_participant");
  if (share.status !== "pending") return left("invalid_transition");

  const split = await deps.repos.expenseSplit.findById(share.splitId);
  if (!split || split.cancelledAt) return left("split_not_found");

  // Condicional (WHERE status='pending') — undefined se outra chamada já mudou o estado (corrida).
  const updated = await deps.repos.splitShare.updateStatus(shareId, "pending", "paid");
  if (!updated) return left("invalid_transition");

  // Sem isso o criador só descobria que dá pra confirmar abrindo a tela por conta própria.
  const [transaction, participant] = await Promise.all([
    deps.repos.transaction.findById(split.transactionId),
    deps.repos.user.findById(actor.userId),
  ]);
  await createNotification(deps, {
    userId: split.createdBy,
    type: "split_payment_paid",
    title: "Pagamento marcado",
    body: `${participant?.name ?? "Alguém"} marcou "${transaction?.description ?? "a despesa dividida"}" como pago — confirme o recebimento.`,
    data: { splitId: split.id, shareId },
  });

  return right(updated);
}
