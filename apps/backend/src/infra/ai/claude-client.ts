import Anthropic from "@anthropic-ai/sdk";
import { loadAiEnv } from "./env";

/**
 * Modelos do pipeline em camadas (spec: "Arquitetura do agente de IA"):
 * Camada 1 (roteador + parsing) usa o modelo barato; Camada 2 (agente com
 * tool use, só perguntas analíticas complexas) usa o modelo maior.
 */
export const ROUTER_MODEL = "claude-haiku-4-5";
export const ANALYST_MODEL = "claude-opus-4-8";

let cached: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!cached) cached = new Anthropic({ apiKey: loadAiEnv().ANTHROPIC_API_KEY });
  return cached;
}
