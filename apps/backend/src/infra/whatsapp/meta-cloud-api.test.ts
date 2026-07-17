/**
 * Testes de assinatura/verificação do webhook da Meta Cloud API — puros, sem
 * rede (`sendWhatsAppText` não é testado aqui). Críticos: um bug aqui é uma
 * forma de falsificar requisições do webhook.
 */
import { describe, expect, test } from "bun:test";
import { verifyWebhookChallenge, verifyWebhookSignature } from "./meta-cloud-api";

process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id";
process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
process.env.WHATSAPP_VERIFY_TOKEN = "meu-verify-token";
process.env.WHATSAPP_APP_SECRET = "segredo-de-teste";

function signaturePara(rawBody: string): string {
  const hex = new Bun.CryptoHasher("sha256", "segredo-de-teste").update(rawBody).digest("hex");
  return `sha256=${hex}`;
}

describe("whatsapp: verificação do webhook (GET)", () => {
  test("aceita mode=subscribe com o verify_token certo", () => {
    expect(verifyWebhookChallenge("subscribe", "meu-verify-token")).toBe(true);
  });

  test("rejeita verify_token errado", () => {
    expect(verifyWebhookChallenge("subscribe", "token-errado")).toBe(false);
  });

  test("rejeita mode diferente de subscribe", () => {
    expect(verifyWebhookChallenge("unsubscribe", "meu-verify-token")).toBe(false);
  });
});

describe("whatsapp: assinatura do webhook (POST)", () => {
  test("aceita assinatura válida do corpo", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(verifyWebhookSignature(body, signaturePara(body))).toEqual({ valid: true });
  });

  test("rejeita assinatura de outro corpo (payload adulterado) com motivo mismatch", () => {
    const body = JSON.stringify({ hello: "world" });
    const outraAssinatura = signaturePara(JSON.stringify({ hello: "mundo" }));
    expect(verifyWebhookSignature(body, outraAssinatura)).toEqual({ valid: false, reason: "mismatch" });
  });

  test("rejeita header ausente com motivo missing_header", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(verifyWebhookSignature(body, null)).toEqual({ valid: false, reason: "missing_header" });
  });

  test("rejeita header em formato errado com motivo invalid_format", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(verifyWebhookSignature(body, "md5=abc123")).toEqual({ valid: false, reason: "invalid_format" });
  });
});
