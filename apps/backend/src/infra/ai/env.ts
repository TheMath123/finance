import { z } from 'zod';

/** Env da IA (OpenRouter — gateway multi-provedor via SDK da OpenAI), validada no primeiro uso do client — mesmo padrão de packages/email e infra/whatsapp. */
const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  /** Modelo da Camada 1 (roteador barato) — string "provedor/modelo" do OpenRouter, trocável sem mudar código. */
  AI_ROUTER_MODEL: z.string().min(1).default('google/gemini-2.5-flash-lite'),
  /** Modelo da Camada 2 (agente com tool use, perguntas analíticas) — mais capaz, ainda barato. */
  AI_ANALYST_MODEL: z.string().min(1).default('google/gemini-2.5-flash'),
});

export type AiEnv = z.infer<typeof envSchema>;

export function loadAiEnv(): AiEnv {
  return envSchema.parse(process.env);
}
