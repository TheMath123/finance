import { Elysia } from "elysia";
import { verifyWebhookChallenge, verifyWebhookSignature } from "../../../../infra/whatsapp/meta-cloud-api";
import type { AppDeps } from "../../../deps";

interface MetaWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        messages?: { from: string; type: string; text?: { body: string } }[];
      };
    }[];
  }[];
}

function extractTextMessages(payload: MetaWebhookPayload): { from: string; text: string }[] {
  const messages: { from: string; text: string }[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type === "text" && message.text?.body) {
          messages.push({ from: message.from, text: message.text.body });
        }
      }
    }
  }
  return messages;
}

/**
 * Webhook da Meta Cloud API (conversa privada, M2-06 — grupos ficam de fora
 * por ora: a Groups API exige um número com "Official Business Account", que
 * o número de teste atual não tem).
 */
export const whatsappWebhookRoute = (deps: AppDeps) =>
  new Elysia()
    // Verificação inicial do webhook no painel do Meta (hub.challenge).
    .get("/whatsapp/webhook", ({ query, set }) => {
      const mode = (query as Record<string, string | undefined>)["hub.mode"] ?? null;
      const token = (query as Record<string, string | undefined>)["hub.verify_token"] ?? null;
      const challenge = (query as Record<string, string | undefined>)["hub.challenge"] ?? null;
      if (challenge && verifyWebhookChallenge(mode, token)) {
        set.status = 200;
        return challenge;
      }
      set.status = 403;
      return "Forbidden";
    })
    // A Meta exige resposta rápida — nunca processar de forma síncrona aqui
    // (spec M2-06): só valida a assinatura e enfileira, sem esperar o job.
    .post("/whatsapp/webhook", async ({ request, set }) => {
      const raw = await request.text();
      const signature = request.headers.get("x-hub-signature-256");
      if (!verifyWebhookSignature(raw, signature)) {
        set.status = 401;
        return;
      }
      set.status = 200;

      let payload: MetaWebhookPayload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      for (const message of extractTextMessages(payload)) {
        void deps
          .dispatch("whatsapp.inbound-message", message)
          .catch((error) => deps.httpLogger.error({ scope: "whatsapp", err: error }, "dispatch_failed"));
      }
    });
