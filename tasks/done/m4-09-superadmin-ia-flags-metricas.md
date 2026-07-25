# M4-09 — Superadmin: guardrails de IA, feature flags e métricas de uso

**Status:** 🟢 Concluída (2026-07-25, validada ponta a ponta)

## Contexto

Última fatia de "configurações globais" do spec: "parâmetros dos
guardrails de IA (orçamentos de tokens), feature flags e métricas de uso".

## Escopo

### Backend
- **Gap de arquitetura**: orçamento de tokens hoje é configuração
  **estática** (env/`deps`, ver `apps/backend/src/application/deps.ts` e
  uso em `handle-inbound-message.ts`) — pra virar editável em runtime pelo
  painel, precisa migrar pra uma tabela de configuração
  (`platform_config` ou similar) lida com cache curto (reaproveita o port
  de `Cache` do M2-08), não mais só `process.env`.
- **Feature flags**: não existe nada hoje — decisão simples/YAGNI:
  tabela `feature_flags` (`key`, `enabled`, `description`), sem sistema
  de rollout percentual/segmentação (não foi pedido, over-engineering pra
  esse estágio). Helper `isFeatureEnabled(key)` consultado onde precisar
  gatear algo.
- **Métricas de uso**: decisão de escopo antes de implementar — spec não
  detalha quais métricas. Sugestão mínima consistente com o que já é
  medido no sistema: usuários ativos, workspaces por plano
  (free/premium), volume de transações/mês, gasto de tokens de IA por
  camada (0/1/2 do pipeline, já logado em `handle-inbound-message.ts`).
  Endpoint de agregação novo em `http/modules/admin/routes/metrics.ts`.

### Dashboard
- `routes/(admin)/ai-settings/+page.svelte` — editar orçamentos de
  token/limites por requisição e por usuário.
- `routes/(admin)/feature-flags/+page.svelte` — toggle simples por flag.
- `routes/(admin)/metrics/+page.svelte` — números + gráficos (skill
  `dataviz` pra qualquer chart aqui também).

## Dependências

M4-07 (guard + auditoria). Pode rodar em paralelo ao M4-08.

## Decisões em aberto

- Confirmar com o usuário a lista final de métricas antes de implementar
  o endpoint de agregação (ver sugestão mínima acima) — é decisão de
  produto, não técnica.

## Critério de conclusão

Mudar um orçamento de token pelo painel e confirmar (via log/teste) que o
pipeline de IA passa a respeitar o novo valor sem redeploy; criar uma
feature flag e confirmar que `isFeatureEnabled` reflete a mudança na hora.

## Implementação (2026-07-25)

Decisões confirmadas com o usuário antes de implementar: (1) métricas
usam a sugestão mínima do escopo original; (2) as 3 frentes (orçamento de
IA, feature flags, métricas) foram feitas juntas, como no M4-08.

### Descoberta que mudou o escopo de métricas

Ao implementar, ficou claro que "gasto de tokens por camada" não existia
de fato — só havia um contador Redis agregado por usuário/dia (sem
histórico, sem quebra por camada). Perguntei ao usuário: ele escolheu
adicionar instrumentação real em vez de deixar a métrica de fora. Isso
expandiu o escopo original:

- `route-chatbot-message.ts` (Camada 1) ganhou `usageByLayer` no retorno
  (`ChatbotReply`) — antes o uso da Camada 2 (pergunta analítica) era só
  somado ao total, sem registro separado.
- Nova tabela `ai_usage_logs` (userId/layer/inputTokens/outputTokens),
  gravada em `handle-inbound-message.ts` logo após `recordUsage`.
- Camada 0 (determinística) nunca aparece — nunca chama IA, custo zero.

### Orçamento de IA editável em runtime

- Nova tabela `platform_settings` (singleton) substitui
  `DAILY_TOKEN_BUDGET_PER_USER` (constante que vivia em
  `redis-token-budget.ts`). `createRedisTokenBudget` passou a receber
  `getDailyBudget: () => Promise<number>` em vez de ler a constante.
- Cache curto (`readDailyTokenBudget`, TTL 30s, chave
  `platform:ai-daily-token-budget`) evita bater no Postgres a cada
  mensagem do WhatsApp. `updateAiSettings` faz **write-through** na mesma
  chave — a mudança reflete imediatamente, sem esperar o TTL expirar
  (critério de conclusão "sem redeploy").
- `composition.ts` e `worker.ts` (processo separado que roda o pipeline
  de IA de verdade) foram os dois pontos que precisaram da nova fiação.

### Feature flags

Tabela `feature_flags` (key/enabled/description) simples, sem rollout
percentual — YAGNI, nada pede isso ainda. Helper `isFeatureEnabled(deps,
key)` em `application/services/feature-flags.ts`, pronto pro primeiro
consumidor futuro (nenhum existe ainda).

### Métricas

Novo `PlatformMetricsRepository` (cross-workspace, não cabia nos repos de
domínio existentes, todos escopados por workspace/ator): total de
usuários/suspensos, workspaces por plano e por tipo, transações no mês
atual. Combinado com `aiUsageLog.aggregateByLayerSince(30 dias)` no
use-case `getPlatformMetrics`. Dashboard usa o mesmo padrão visual de
barra-em-tabela já validado na Home (M4-05), com paleta categórica da
skill `dataviz` (`references/palette.md`, 4 primeiros slots).

### Testes e risco de paralelismo (mesma lição do M4-08)

`platform_settings` é outra tabela singleton global — o teste de
orçamento captura o valor original e restaura no `finally`. Métricas são
testadas com asserções de limite inferior (`toBeGreaterThan`), nunca
igualdade exata, porque `users`/`workspaces`/`transactions` são tabelas
globais que outros arquivos de teste também povoam em paralelo.

### Validação end-to-end real

Login como superadmin; em `/admin/ai-settings`, mudei o orçamento de
100000 para 55000 e confirmei via `GET /admin/ai-settings` direto no
backend que refletiu; restaurei pra 100000. Em `/admin/feature-flags`,
criei `teste-smoke` ativada, confirmei na listagem, desativei, confirmei
`enabled:false` via API, excluí e confirmei que sumiu. Em
`/admin/metrics`, confirmei dados agregados reais (10112 usuários, 4
suspensos, breakdown por plano/tipo de workspace) — nada zerado ou fake.

Verificado: `bun run lint` (Biome, monorepo), `svelte-check` do
dashboard, `tsc --noEmit` do backend, suíte completa do backend (186
testes, 9 novos), build de produção do dashboard, e o fluxo E2E manual
acima.
