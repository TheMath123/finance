import OpenAI from "openai";
import { loadAiEnv } from "./env";

/**
 * Gateway multi-provedor (OpenRouter): uma chave só, modelo trocado por
 * string ("provedor/modelo") sem lock-in em nenhuma empresa de IA — spec
 * atualizada pra evitar dependência exclusiva da Anthropic. `getRouterModel`/
 * `getAnalystModel` leem do env (com defaults em modelos baratos/eficientes,
 * Gemini Flash) e podem apontar pra qualquer modelo do catálogo do
 * OpenRouter (ex.: Kimi K2, DeepSeek, Llama) sem tocar em código. Tudo lazy
 * (só valida env no primeiro uso real) — mesmo padrão de antes, pra não
 * quebrar o boot da aplicação quando a chave ainda não está configurada.
 */
export function getRouterModel(): string {
  return loadAiEnv().AI_ROUTER_MODEL;
}

export function getAnalystModel(): string {
  return loadAiEnv().AI_ANALYST_MODEL;
}

let cached: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (!cached) {
    cached = new OpenAI({
      apiKey: loadAiEnv().OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }
  return cached;
}
