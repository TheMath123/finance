import { left, right, type Either } from "@finance/shared";
import type { UseCaseDeps } from "../../deps";
import { createNotification } from "../notification/create-notification";
import type { WhatsAppLinkError } from "./errors";

export interface ConfirmWhatsAppLinkOutput {
  userId: string;
  userName: string;
  /** Workspace padrão do usuário — onde as transações da conversa privada caem (spec). */
  workspaceName: string;
}

/**
 * Confirma o vínculo a partir de uma mensagem recebida no webhook do
 * WhatsApp (M2-06, chamado pelo job que processa a mensagem). O número
 * remetente É o dado sendo vinculado — só é conhecido quando a mensagem
 * chega — então a busca do código é por hash, sem escopo de usuário. A
 * proteção de força bruta é o rate limit por telefone abaixo, não uma
 * coluna `attempts` por linha (ver `whatsapp-link-code.ts` no schema).
 */
export async function confirmWhatsAppLink(
  deps: Pick<UseCaseDeps, "repos" | "rateLimiter" | "tokens" | "uow" | "dispatch" | "notificationBus">,
  phone: string,
  code: string,
): Promise<Either<WhatsAppLinkError, ConfirmWhatsAppLinkOutput>> {
  if (await deps.rateLimiter.isLimited(`whatsapp-link-confirm:${phone}`, 3, 15 * 60_000)) {
    return left("rate_limited");
  }

  const stored = await deps.repos.whatsappLinkCode.findValidByHash(deps.tokens.hashOpaque(code));
  if (!stored) return left("invalid_code");

  const existingOwner = await deps.repos.user.findByPhone(phone);
  if (existingOwner && existingOwner.id !== stored.userId) return left("phone_already_linked");

  const user = await deps.uow.run(async (repos) => {
    await repos.user.updatePhone(stored.userId, phone);
    await repos.whatsappLinkCode.markUsed(stored.id);
    return repos.user.findById(stored.userId);
  });
  if (!user) throw new Error("usuário do código de vínculo do WhatsApp não encontrado");

  const workspace = user.defaultWorkspaceId
    ? await deps.repos.workspace.findById(user.defaultWorkspaceId)
    : undefined;

  await createNotification(deps, {
    userId: user.id,
    type: "whatsapp_linked",
    title: "WhatsApp vinculado",
    body: `O número ${phone} foi vinculado à sua conta.`,
    data: { phone },
  });

  return right({ userId: user.id, userName: user.name, workspaceName: workspace?.name ?? "seu workspace" });
}
