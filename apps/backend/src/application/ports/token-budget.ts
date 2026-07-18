/**
 * Guardrail de custo (spec: "Limite de tokens por requisição e por usuário").
 * Orçamento diário de tokens de IA por usuário — checado antes de chamar a
 * IA (barato, só leitura) e incrementado depois que a chamada retorna (só
 * então o custo real é conhecido).
 */
export interface TokenBudget {
  isOverBudget(userId: string): Promise<boolean>;
  recordUsage(userId: string, tokens: number): Promise<void>;
}
