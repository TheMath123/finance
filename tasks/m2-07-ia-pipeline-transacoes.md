# M2-07 — Pipeline de IA: interpretar/categorizar transações

**Status:** 🟢 Concluída (código completo e testado; validação ponta-a-ponta com a API real ainda pendente — `OPENROUTER_API_KEY` não configurada).

**Atualização (2026-07-18):** trocado o acesso direto à Anthropic por um
gateway multi-provedor — [OpenRouter](https://openrouter.ai), acessado via
SDK oficial da OpenAI (`openai` no npm) apontando `baseURL` pro OpenRouter.
Motivo: evitar lock-in numa única empresa de IA — o modelo de cada camada
agora é uma string de env (`AI_ROUTER_MODEL`/`AI_ANALYST_MODEL`,
`infra/ai/env.ts`), trocável por qualquer modelo do catálogo (Gemini, Kimi,
DeepSeek, Llama, a própria Anthropic via OpenRouter, etc.) sem mudar
código. Defaults escolhidos por custo/eficiência (Gemini 2.5 Flash
Lite/Flash) — nenhum modelo do Kimi ou Gemini tinha variante genuinamente
gratuita (`:free`) disponível no catálogo em 2026-07-18, mas ambos são
muito baratos (frações de centavo por mensagem, dado o `max_tokens: 1024` e
o volume curto de mensagens de WhatsApp) e há modelos `:free` de outros
provedores no catálogo caso o custo zero seja prioridade sobre a
qualidade. `infra/ai/claude-client.ts` virou `infra/ai/ai-client.ts`
(`getAiClient`, `getRouterModel`, `getAnalystModel` — todos lazy, mesmo
padrão de antes).

## Contexto

Coração do M2 do ponto de vista de produto: registrar transação por
linguagem natural no chatbot + categorização automática no app. O spec já
fechou a arquitetura em detalhe (seção "Arquitetura do agente de IA —
fechada em 2026-07-13") — seguido à risca, sem improvisar RAG.

## Implementação

### Camada 0 — determinística (custo zero)
- `apps/backend/src/domain/services/transaction-text-parser.ts` —
  `parseAmountAndRest`: regex pura, extrai valor (BR: vírgula decimal,
  ponto de milhar) + resto do texto. Testado isoladamente (7 casos).
- `apps/backend/src/application/use-cases/transaction/parse-obvious-transaction.ts` —
  só resolve se achar **exatamente uma** conta/cartão ativo mencionado no
  texto **e** já existir uma transação anterior com a mesma
  `descriptionNormalized` (cache de categorização, novo método
  `findMostUsedCategory` no `TransactionRepository`). Qualquer ambiguidade
  cai pra Camada 1. Testado (5 casos).
- `createTransaction` ganhou `source?: TransactionSource` (era hardcoded
  `"app"`) — agora é de fato canal-agnóstica (spec).

### Camada 1 — roteador barato (modelo via `AI_ROUTER_MODEL`, default Gemini 2.5 Flash Lite)
- `apps/backend/src/application/use-cases/transaction/route-chatbot-message.ts` —
  classifica intenção (`register_transaction` | `analytical_question` |
  `out_of_scope`) e extrai campos da transação via **structured output**
  (Zod + `zodOutputFormat`, `client.messages.parse`). System prompt
  congelado com `cache_control` — categorias/contas do workspace ficam de
  propósito FORA do prompt (resolvidas depois, no código, contra os dados
  reais) pra não invalidar o cache entre usuários diferentes.
- Resolução de categoria: match exato por nome normalizado contra as
  categorias do workspace; sem match, cai na categoria `isFallback`
  ("Outros", já existia desde o M1 exatamente pra isso).
- Resolução de conta/cartão: match exato por nome normalizado; ambíguo (mais
  de um) ou nenhum → pergunta de esclarecimento em vez de arriscar.

### Camada 2 — agente com tool use (modelo via `AI_ANALYST_MODEL`, default Gemini 2.5 Flash)
- `apps/backend/src/application/use-cases/summary/analyst-agent.ts` — loop
  manual de tool use (não o Tool Runner beta — controle total, sem
  dependência beta) com 4 tools de agregação via SQL, reaproveitando
  services do M1: `get_monthly_summary`/`get_available_projection`
  (`monthlySummary`, que teve a assinatura estreitada pra
  `Pick<UseCaseDeps,"repos">`), `sum_by_category` (`expenseByCategory`,
  já existia), `get_invoice_total` (resolve cartão por nome +
  `invoice.listByCard` + `invoice.total`). Nunca devolve lista de
  transação crua — só números agregados (spec). `MAX_TURNS = 4` como trava
  contra loop infinito.

### Guardrails de custo
- `apps/backend/src/application/ports/token-budget.ts` +
  `infra/ai/redis-token-budget.ts` (produção) /
  `infra/ai/in-memory-token-budget.ts` (testes) — orçamento diário de
  tokens **por usuário** (`DAILY_TOKEN_BUDGET_PER_USER = 100_000`),
  checado (leitura barata) antes de chamar a IA e incrementado depois que
  a chamada retorna (só aí o custo real é conhecido).
- **Fallback determinístico**: sem orçamento ou com erro na chamada da IA
  (rede, API fora do ar), cai pro parser da Camada 0 **sem exigir cache de
  categorização** — usa a categoria `isFallback` em vez de desistir. Só
  registra se resolver conta/cartão sem ambiguidade (spec.md fala em
  "fallback determinístico (média histórica)", que se encaixa melhor na
  M2-08/previsão; aqui, pra categorização/parsing, a interpretação
  equivalente é "cair pra uma categoria segura em vez de travar").
- **Fora de escopo**: recusa amigável já embutida na Camada 1
  (`out_of_scope`) e reforçada no system prompt da Camada 2.
- **Respostas curtas**: `max_tokens: 1024` nas duas camadas de IA.

### Pipeline completo
`apps/backend/src/application/use-cases/whatsapp/handle-inbound-message.ts`
— Camada 0 → checa orçamento → Camada 1 (que chama a Camada 2 internamente
se for pergunta analítica) → grava uso de tokens → fallback determinístico
em qualquer falha/estouro. 93/93 testes da suíte do backend passando,
typecheck limpo.

## Pendências

- Validar de verdade contra a API real via OpenRouter (precisa de
  `OPENROUTER_API_KEY` no `.env`, gerada em openrouter.ai/keys) — hoje só o
  caminho de fallback foi exercitado nos testes (a chave não está
  configurada neste ambiente).
- Reaproveitar a categorização automática no app (o cache já existe no
  banco; falta expor no formulário de criar transação do app — não pedido
  ainda).
- MCP foi considerado e descartado: nessa arquitetura quem chama a API da
  Anthropic e quem executa as tools é o mesmo processo — MCP só
  adicionaria uma volta de rede desnecessária, sem economia de token real.

## Dependências

Nenhuma técnica bloqueante — [[m2-06-whatsapp-webhook-chatbot]] (concluída)
é quem entrega as mensagens reais pro pipeline.
