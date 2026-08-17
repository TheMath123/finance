import { z } from 'zod';

/** Envs do app mobile, validadas no boot (regra: toda env nova entra aqui E no .env.example). */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  /** Número do bot no WhatsApp (E.164, sem "+"), pra abrir o wa.me com o código pré-preenchido. */
  EXPO_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  /**
   * Client ID tipo "Web application" do Google Cloud Console — obrigatório
   * pro GoogleSignin devolver `idToken` (ver GoogleSignin.configure em
   * lib/hooks/use-google-auth.ts), mesmo em build Android/iOS nativo. Mesmo
   * valor de PUBLIC_GOOGLE_CLIENT_ID do dashboard e de um dos
   * GOOGLE_CLIENT_IDS do backend. Opcional: sem valor, o botão "Continuar
   * com Google" some (não faz sentido mostrar um botão que vai falhar).
   */
  EXPO_PUBLIC_CLIENT_ID: z.string().optional(),
  /** Client ID tipo "iOS" do Google Cloud Console — só entra em builds iOS. */
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_WHATSAPP_NUMBER: process.env.EXPO_PUBLIC_WHATSAPP_NUMBER,
    EXPO_PUBLIC_CLIENT_ID: process.env.EXPO_PUBLIC_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
}

export const env = loadEnv();
