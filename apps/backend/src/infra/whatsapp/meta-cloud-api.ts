import { timingSafeEqual } from "node:crypto";
import { loadWhatsAppEnv, type WhatsAppEnv } from "./env";

const GRAPH_API_VERSION = "v21.0";

let cachedEnv: WhatsAppEnv | null = null;
function env(): WhatsAppEnv {
  if (!cachedEnv) cachedEnv = loadWhatsAppEnv();
  return cachedEnv;
}

/** Envia uma mensagem de texto simples via Meta Cloud API. */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const { WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN } = env();
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`falha ao enviar mensagem no WhatsApp (status ${response.status}): ${errorBody}`);
  }
}

/** GET de verificação do webhook (Meta manda `hub.mode`/`hub.verify_token`/`hub.challenge`). */
export function verifyWebhookChallenge(mode: string | null, token: string | null): boolean {
  return mode === "subscribe" && token === env().WHATSAPP_VERIFY_TOKEN;
}

export type SignatureCheckResult =
  | { valid: true }
  | { valid: false; reason: "missing_header" | "invalid_format" | "mismatch" };

/**
 * Valida o header `X-Hub-Signature-256` do POST do webhook contra o corpo cru
 * (precisa do texto original, não do JSON já parseado — HMAC quebra com
 * qualquer diferença de espaçamento/ordem de chaves). Devolve o motivo da
 * rejeição (não só um booleano) pra quem chama poder logar de forma
 * acionável — depurar um "nada aparece no log" é bem pior que depurar um
 * motivo específico.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): SignatureCheckResult {
  if (!signatureHeader) return { valid: false, reason: "missing_header" };
  if (!signatureHeader.startsWith("sha256=")) return { valid: false, reason: "invalid_format" };

  const expectedHex = new Bun.CryptoHasher("sha256", env().WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const receivedHex = signatureHeader.slice("sha256=".length);
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  const valid = expected.length === received.length && timingSafeEqual(expected, received);
  return valid ? { valid: true } : { valid: false, reason: "mismatch" };
}
