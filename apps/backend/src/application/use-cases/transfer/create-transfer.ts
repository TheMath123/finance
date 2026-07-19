import { left, right, type Either } from "@finance/shared";
import type { InterUserTransfer } from "../../../domain/entities/inter-user-transfer";
import { normalizeDescription } from "../../../domain/services/occurrence-rules";
import type { Actor, UseCaseDeps } from "../../deps";
import { createNotification } from "../notification/create-notification";
import type { TransferError } from "./errors";

/** Spec: "pendências expiram (ex.: 30 dias) sem afetar o lado do remetente". */
export const TRANSFER_EXPIRATION_DAYS = 30;

export interface CreateTransferInput {
  /** Telefone ou e-mail de um usuário existente na plataforma. */
  recipient: string;
  /** Centavos. */
  amount: number;
  description: string;
  /** Conta de origem, no workspace do ator. */
  accountId: string;
}

function todayCompetence(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createTransfer(
  deps: Pick<UseCaseDeps, "repos" | "uow" | "rateLimiter" | "dispatch">,
  actor: Actor,
  input: CreateTransferInput,
): Promise<Either<TransferError, InterUserTransfer>> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return left("invalid_amount");

  if (await deps.rateLimiter.isLimited(`transfer-create:${actor.userId}`, 10, 60 * 60_000)) {
    return left("rate_limited");
  }

  const recipient = input.recipient.includes("@")
    ? await deps.repos.user.findByEmail(input.recipient)
    : await deps.repos.user.findByPhone(input.recipient);
  if (!recipient) return left("recipient_not_found");
  if (recipient.id === actor.userId) return left("self_transfer");

  // Auditoria de segurança (2026-07-19): o limite acima é só por remetente — alguém com
  // várias contas conseguiria inundar UM destinatário específico. Chave separada por destino.
  if (await deps.rateLimiter.isLimited(`transfer-create:to:${recipient.id}`, 30, 60 * 60_000)) {
    return left("rate_limited");
  }

  const [sender, account, category] = await Promise.all([
    deps.repos.user.findById(actor.userId),
    deps.repos.account.findActiveInWorkspace(actor.workspaceId, input.accountId),
    deps.repos.category.findFallback(actor.workspaceId),
  ]);
  if (!account) return left("account_not_found");
  if (!sender || !category) throw new Error("workspace do ator sem usuário/categoria fallback");

  /** Destinatário já confia no remetente → pula o aceite manual (spec: contato confiável). */
  const trust = await deps.repos.trustedContact.findByPair(recipient.id, actor.userId);
  const trustedAccount = trust ? await deps.repos.account.findById(trust.defaultAccountId) : undefined;
  const autoAccept = Boolean(trustedAccount && !trustedAccount.archivedAt);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRANSFER_EXPIRATION_DAYS * 24 * 60 * 60_000);

  const transfer = await deps.uow.run(async (repos) => {
    const fromDescription = input.description || `Transferência enviada para ${recipient.name}`;
    const fromTx = await repos.transaction.create({
      workspaceId: actor.workspaceId,
      createdBy: actor.userId,
      description: fromDescription,
      descriptionNormalized: normalizeDescription(fromDescription),
      amount: input.amount,
      type: "expense",
      method: "pix",
      date: todayCompetence(),
      categoryId: category.id,
      accountId: account.id,
      source: "app",
    });

    let toTransactionId: string | null = null;
    if (autoAccept && trustedAccount) {
      const toCategory = await repos.category.findFallback(trustedAccount.workspaceId);
      const toDescription = `Transferência recebida de ${sender.name}`;
      const toTx = await repos.transaction.create({
        workspaceId: trustedAccount.workspaceId,
        createdBy: recipient.id,
        description: toDescription,
        descriptionNormalized: normalizeDescription(toDescription),
        amount: input.amount,
        type: "income",
        method: "pix",
        date: todayCompetence(),
        categoryId: toCategory!.id,
        accountId: trustedAccount.id,
        source: "app",
      });
      toTransactionId = toTx.id;
    }

    return repos.interUserTransfer.create({
      fromUserId: actor.userId,
      fromTransactionId: fromTx.id,
      toUserId: recipient.id,
      toTransactionId,
      amount: input.amount,
      description: fromDescription,
      status: autoAccept ? "accepted" : "pending",
      expiresAt,
    });
  });

  if (transfer.status === "accepted") {
    await createNotification(deps, {
      userId: actor.userId,
      type: "transfer_accepted",
      title: "Transferência aceita",
      body: `${recipient.name} confia em você — a transferência caiu automaticamente.`,
      data: { transferId: transfer.id },
    });
  } else {
    await createNotification(deps, {
      userId: recipient.id,
      type: "transfer_pending",
      title: "Você recebeu uma transferência",
      body: `${sender.name} quer te enviar dinheiro. Toque pra aceitar.`,
      data: { transferId: transfer.id },
    });
  }

  return right(transfer);
}
