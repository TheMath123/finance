import type { UseCaseDeps } from "../../deps";
import { confirmWhatsAppLink } from "./confirm-link";

export interface InboundWhatsAppMessage {
  from: string;
  text: string;
}

export interface WhatsAppReply {
  to: string;
  body: string;
}

const SIX_DIGIT_CODE = /^\d{6}$/;

/**
 * Roteamento de mensagem recebida no webhook (M2-06) — decide o que responder,
 * mas não envia nada: quem chama (job handler, `main/job-handlers.ts`) é quem
 * fala com a Meta Cloud API, mantendo a use-case livre de infra concreta
 * (mesmo padrão do e-mail: use-case dispara job, `mailer` só é chamado no
 * handler). Número não vinculado só recebe instrução de vínculo — nunca dado
 * financeiro (spec). Interpretação de linguagem natural de número já
 * vinculado é a M2-07 (fora de escopo aqui).
 */
export async function handleInboundWhatsAppMessage(
  deps: Pick<UseCaseDeps, "repos" | "rateLimiter" | "tokens" | "uow" | "dispatch">,
  message: InboundWhatsAppMessage,
): Promise<WhatsAppReply> {
  const user = await deps.repos.user.findByPhone(message.from);

  if (!user) {
    const trimmed = message.text.trim();
    if (SIX_DIGIT_CODE.test(trimmed)) {
      const result = await confirmWhatsAppLink(deps, message.from, trimmed);
      return {
        to: message.from,
        body: result.ok
          ? `Vínculo confirmado, ${result.value.userName}! Suas transações por aqui vão pro workspace "${result.value.workspaceName}".`
          : "Código inválido ou expirado. Gere um novo no app (Perfil > WhatsApp) e tente de novo.",
      };
    }
    return {
      to: message.from,
      body: "Esse número ainda não está vinculado a nenhuma conta. Abra o app, vá em Perfil > WhatsApp e gere um código de vínculo.",
    };
  }

  return {
    to: message.from,
    body: "Recebi sua mensagem! O registro de transações por WhatsApp ainda está sendo implementado.",
  };
}
