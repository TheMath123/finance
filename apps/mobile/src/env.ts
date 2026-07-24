import { z } from 'zod';

/** Envs do app mobile, validadas no boot (regra: toda env nova entra aqui E no .env.example). */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  /** Número do bot no WhatsApp (E.164, sem "+"), pra abrir o wa.me com o código pré-preenchido. */
  EXPO_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_WHATSAPP_NUMBER: process.env.EXPO_PUBLIC_WHATSAPP_NUMBER,
  });
}

export const env = loadEnv();
