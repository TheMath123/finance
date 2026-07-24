# M4-09 — Superadmin: guardrails de IA, feature flags e métricas de uso

**Status:** 🔵 Backlog (não iniciada)

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
