import { mailer } from "@finance/email";
import type { JobHandlers } from "@finance/queues";
import { handleInboundWhatsAppImage, handleInboundWhatsAppMessage } from "../application/use-cases/whatsapp";
import type { UseCaseDeps } from "../application/deps";
import { sendExpoPush } from "../infra/push/expo-push";
import { downloadMedia, fetchMediaUrl, sendWhatsAppText } from "../infra/whatsapp/meta-cloud-api";

/**
 * Handlers dos jobs — compartilhados entre o composition root (enfileira) e
 * o worker (consome). Fábrica (não objeto estático) porque o handler do
 * WhatsApp precisa de `repos`/`uow`/`rateLimiter`/`tokens` pra confirmar
 * vínculo (`confirmWhatsAppLink`) e `tokenBudget` pro pipeline de IA
 * (M2-07), e `storage` pro anexo de comprovante via foto (M3-05); os
 * demais handlers ignoram `deps`.
 */
export function createJobHandlers(
  deps: Pick<
    UseCaseDeps,
    "repos" | "rateLimiter" | "tokenBudget" | "tokens" | "uow" | "dispatch" | "cache" | "storage" | "notificationBus"
  >,
): JobHandlers {
  return {
    "email.password-reset": (p) => mailer.sendPasswordReset(p),
    "email.verify-email": (p) => mailer.sendEmailVerification(p),
    "email.password-changed": (p) => mailer.sendPasswordChanged(p),
    "email.confirm-email-change": (p) => mailer.sendConfirmEmailChange(p),
    "email.email-changed": (p) => mailer.sendEmailChanged(p),
    "email.confirm-account-deletion": (p) => mailer.sendConfirmAccountDeletion(p),
    "email.account-locked": (p) => mailer.sendAccountLocked(p),
    "email.workspace-invite": (p) => mailer.sendWorkspaceInvite(p),
    "push.send": (p) => sendExpoPush(p.tokens, p.title, p.body, p.data, p.categoryId),
    async "whatsapp.inbound-message"(p) {
      const reply = await handleInboundWhatsAppMessage(deps, p);
      await sendWhatsAppText(reply.to, reply.body);
    },
    async "whatsapp.inbound-image"(p) {
      // Download é infra (fala com a Meta) — a use-case só recebe o buffer já pronto.
      const { url, mimeType } = await fetchMediaUrl(p.mediaId);
      const buffer = await downloadMedia(url);
      const reply = await handleInboundWhatsAppImage(deps, { from: p.from, buffer, mimeType: p.mimeType || mimeType });
      await sendWhatsAppText(reply.to, reply.body);
    },
  };
}
