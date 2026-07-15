import { z } from "zod";

/** Envs do app mobile, validadas no boot (regra: toda env nova entra aqui E no .env.example). */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse({
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  });
}

export const env = loadEnv();
