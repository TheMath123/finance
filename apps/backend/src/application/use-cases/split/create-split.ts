import { left, right, type Either } from "@finance/shared";
import type { ExpenseSplit } from "../../../domain/entities/expense-split";
import { splitInstallments } from "../../../domain/services/invoice-rules";
import type { Actor, UseCaseDeps } from "../../deps";
import { createNotification } from "../notification/create-notification";
import type { SplitError } from "./errors";

export type SplitParticipantInput =
  | { type: "user"; contact: string; amount?: number }
  | { type: "external"; name: string; amount?: number };

export interface CreateSplitInput {
  participants: SplitParticipantInput[];
}

export async function createSplit(
  deps: Pick<UseCaseDeps, "repos" | "uow" | "dispatch" | "notificationBus">,
  actor: Actor,
  transactionId: string,
  input: CreateSplitInput,
): Promise<Either<SplitError, ExpenseSplit>> {
  if (input.participants.length === 0) return left("no_participants");

  const transaction = await deps.repos.transaction.findInWorkspace(actor.workspaceId, transactionId);
  if (!transaction) return left("transaction_not_found");
  if (transaction.type !== "expense") return left("not_an_expense");
  /** Reembolso vira uma entrada na mesma conta da despesa — sem modelagem de estorno em fatura de cartão ainda. */
  if (!transaction.accountId) return left("unsupported_method");

  const existing = await deps.repos.expenseSplit.findActiveByTransaction(transactionId);
  if (existing) return left("already_split");

  const resolved: { participantUserId: string | null; participantName: string | null; manualAmount?: number }[] = [];
  for (const p of input.participants) {
    if (p.type === "user") {
      const user = p.contact.includes("@")
        ? await deps.repos.user.findByEmail(p.contact)
        : await deps.repos.user.findByPhone(p.contact);
      if (!user) return left("participant_not_found");
      if (user.id === actor.userId) return left("self_participant");
      resolved.push({ participantUserId: user.id, participantName: null, manualAmount: p.amount });
    } else {
      const name = p.name.trim();
      if (!name) return left("participant_not_found");
      resolved.push({ participantUserId: null, participantName: name, manualAmount: p.amount });
    }
  }

  const hasManual = resolved.some((r) => r.manualAmount !== undefined);
  let amounts: number[];
  if (hasManual) {
    if (resolved.some((r) => !Number.isInteger(r.manualAmount) || r.manualAmount! <= 0)) {
      return left("invalid_amount");
    }
    amounts = resolved.map((r) => r.manualAmount!);
    const sum = amounts.reduce((a, b) => a + b, 0);
    // Soma pode ser igual ao total (criador fica sem parte, totalmente reembolsado), nunca maior.
    if (sum > transaction.amount) return left("amounts_exceed_total");
  } else {
    // Divisão igual entre todos (criador + participantes) — criador absorve o resto de centavos.
    const shares = splitInstallments(transaction.amount, resolved.length + 1);
    amounts = shares.slice(1);
  }

  const split = await deps.uow.run(async (repos) => {
    const createdSplit = await repos.expenseSplit.create({ transactionId, createdBy: actor.userId });
    await repos.splitShare.createMany(
      resolved.map((r, i) => ({
        splitId: createdSplit.id,
        participantUserId: r.participantUserId,
        participantName: r.participantName,
        amount: amounts[i]!,
      })),
    );
    await repos.audit.record({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "create",
      entity: "expense_split",
      entityId: createdSplit.id,
    });
    return createdSplit;
  });

  const [shares, creator] = await Promise.all([
    deps.repos.splitShare.listBySplit(split.id),
    deps.repos.user.findById(actor.userId),
  ]);
  for (const share of shares) {
    if (!share.participantUserId) continue;
    await createNotification(deps, {
      userId: share.participantUserId,
      type: "split_payment_pending",
      title: "Você tem uma parte pendente",
      body: `${creator?.name ?? "Alguém"} dividiu "${transaction.description}" com você.`,
      data: { splitId: split.id, shareId: share.id },
    });
  }

  return right(split);
}
