import { mailer } from "@finance/email";
import type { JobHandlers } from "@finance/queues";
import { handleInboundWhatsAppMessage } from "../application/use-cases/whatsapp";
import type { UseCaseDeps } from "../application/deps";
import { sendExpoPush } from "../infra/push/expo-push";
import { sendWhatsAppText } from "../infra/whatsapp/meta-cloud-api";

/**
 * Handlers dos jobs — compartilhados entre o composition root (enfileira) e
 * o worker (consome). Fábrica (não objeto estático) porque o handler do
 * WhatsApp precisa de `repos`/`uow`/`rateLimiter`/`tokens` pra confirmar
 * vínculo (`confirmWhatsAppLink`) e `tokenBudget` pro pipeline de IA
 * (M2-07); os demais handlers ignoram `deps`.
 */
export function createJobHandlers(
  deps: Pick<UseCaseDeps, "repos" | "rateLimiter" | "tokenBudget" | "tokens" | "uow" | "dispatch">,
): JobHandlers {
  return {
    "email.password-reset": (p) => mailer.sendPasswordReset(p),
    "email.verify-email": (p) => mailer.sendEmailVerification(p),
    "email.password-changed": (p) => mailer.sendPasswordChanged(p),
    "email.account-locked": (p) => mailer.sendAccountLocked(p),
    "email.workspace-invite": (p) => mailer.sendWorkspaceInvite(p),
    "push.send": (p) => sendExpoPush(p.tokens, p.title, p.body, p.data),
    async "whatsapp.inbound-message"(p) {
      const reply = await handleInboundWhatsAppMessage(deps, p);
      await sendWhatsAppText(reply.to, reply.body);
    },
  };
}
