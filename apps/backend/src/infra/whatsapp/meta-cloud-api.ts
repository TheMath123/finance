import { timingSafeEqual } from "node:crypto";
import { loadWhatsAppEnv, type WhatsAppEnv } from "./env";

const GRAPH_API_VERSION = "v21.0";

let cachedEnv: WhatsAppEnv | null = null;
function env(): WhatsAppEnv {
  if (!cachedEnv) cachedEnv = loadWhatsAppEnv();
  return cachedEnv;
}

async function sendOnce(to: string, body: string): Promise<void> {
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

/**
 * BR: celular tem um "nono dígito" cuja presença varia entre o número que a
 * Meta manda no webhook (`from`) e o que ela de fato entrega no envio —
 * quirk documentado da própria Meta ("comportamento padrão, não é bug") pra
 * BR/MX. Pior: quando isso acontece, a API retorna 200 normalmente — não dá
 * pra detectar por erro, só mandar as duas variantes de forma preventiva.
 */
export function brazilianAltVariant(to: string): string | null {
  const match = /^55(\d{2})(\d{8,9})$/.exec(to);
  if (!match) return null;
  const [, ddd, subscriber] = match;
  if (subscriber!.length === 9 && subscriber!.startsWith("9")) return `55${ddd}${subscriber!.slice(1)}`;
  if (subscriber!.length === 8) return `55${ddd}9${subscriber}`;
  return null;
}

/**
 * Envia uma mensagem de texto simples via Meta Cloud API. Pra números
 * brasileiros, também tenta a variante alternativa do nono dígito em
 * best-effort (ver `brazilianAltVariant`) — a tentativa principal ainda
 * lança se falhar, a alternativa nunca lança (só reduz o risco de silêncio).
 */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  await sendOnce(to, body);
  const alt = brazilianAltVariant(to);
  if (alt) await sendOnce(alt, body).catch(() => {});
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
