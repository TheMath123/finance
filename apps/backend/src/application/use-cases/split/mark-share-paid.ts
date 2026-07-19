import { left, right, type Either } from "@finance/shared";
import type { SplitShare } from "../../../domain/entities/expense-split";
import type { UseCaseDeps } from "../../deps";
import type { SplitError } from "./errors";

/** Só o próprio participante (com conta) marca "paguei" — externo não passa por aqui. */
export async function markSharePaid(
  deps: Pick<UseCaseDeps, "repos" | "rateLimiter">,
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
  return right(updated);
}
