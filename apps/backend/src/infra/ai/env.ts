import { z } from "zod";

/** Env da IA (Claude), validada no primeiro uso do client — mesmo padrão de packages/email e infra/whatsapp. */
const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
});

export type AiEnv = z.infer<typeof envSchema>;

export function loadAiEnv(): AiEnv {
  return envSchema.parse(process.env);
}
