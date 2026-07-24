import { z } from 'zod';

/** Envs da Meta Cloud API (WhatsApp Business), validadas no primeiro uso do client. */
const envSchema = z.object({
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  /** Definido por nós, conferido contra o `hub.verify_token` que a Meta manda no GET de verificação do webhook. */
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  /** "App secret" do painel do Meta for Developers — assina o `X-Hub-Signature-256` do webhook. */
  WHATSAPP_APP_SECRET: z.string().min(1),
});

export type WhatsAppEnv = z.infer<typeof envSchema>;

export function loadWhatsAppEnv(): WhatsAppEnv {
  return envSchema.parse(process.env);
}
