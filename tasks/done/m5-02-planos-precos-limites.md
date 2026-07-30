# M5-02 — Planos, preços, limites e controle de assinatura por workspace/usuário (superadmin)

**Status:** 🟢 Concluída (2026-07-30, validada ponta a ponta com curl real contra
backend + dashboard rodando)

## Contexto

Levantado ao revisar o superadmin nesta sessão: "plano" era só um enum
decorativo (`workspaces.plan`, `free`/`premium`) sem preço, sem intervalo de
cobrança, sem tela de gestão, e com os limites do free hardcoded em
`plan-limits.ts` (`FREE_PLAN_LIMITS`) — gap já registrado em
`tasks/backlog/m5-02-planos-precos-limites.md` ao fechar o M4.

Decisões fechadas com o usuário antes de implementar:

- **Fase 1 (esta), sem Stripe ainda** — só o modelo de dados completo
  (preço, intervalo de cobrança configurável, limites, features por plano)
  + CRUD no superadmin. Cobrança real (Stripe) fica pra uma M5-03 separada.
- **Tabela, não enum** — o usuário confirmou que vai querer mais tiers em
  breve (não só free/premium).
- **Intervalo de renovação configurável por plano** (unidade + contagem,
  ex. "a cada 3 meses"), já pensando em como isso mapeia 1:1 pra
  `Price`/`interval`+`interval_count` do Stripe na fase 2, sem redesenho.
- **Controle manual de plano por workspace** — pedido no meio da sessão:
  hoje não existia NENHUMA forma de mudar o plano de um workspace fora de
  editar o banco direto. "Recorrência" nesta fase = intervalo de cobrança
  configurado no plano atual (não existe estado de assinatura ao vivo antes
  do Stripe).

## Implementação

### Schema (`packages/db/src/schema/plan.ts`)

Tabela `plans`: `key` (único), `name`, `description`, `priceCents`
(centavos, `bigint`), `billingIntervalUnit` (enum `day`/`week`/`month`/`year`),
`billingIntervalCount`, `limits` (`jsonb`, tipado `PlanLimits` em
`@finance/shared`), `features` (`jsonb string[]`, feature-lock por plano —
distinto do `feature_flags` do M4-09, que é kill-switch global), `isActive`,
`sortOrder`. `jsonb` em vez de colunas soltas pros limites: permite tiers e
limites novos sem migration.

`workspaces.plan` (enum) virou `workspaces.planId` (FK pra `plans.id`,
`NOT NULL`). Migration em **3 estágios** pra evitar o prompt interativo do
`drizzle-kit` (rename-ambiguity entre o enum antigo e o novo
`billing_interval`) e permitir backfill de dados reais:
1. `0024_military_mariko_yashida.sql` — cria `plans` + `planId` nullable
   **+ seed hand-written** dos planos `free`/`premium` (idempotente,
   `ON CONFLICT DO NOTHING`) **+ backfill** (`UPDATE workspaces SET plan_id = ...`
   lendo o enum antigo, que ainda coexistia nesse estágio).
2. `0025_complex_the_twelve.sql` — `plan_id` vira `NOT NULL`, dropa a coluna
   `plan` antiga e o enum `workspace_plan`.

`packages/db/src/seed.ts` (seed de DEV) ganhou um fallback que semeia os
mesmos 2 planos se não existirem (a migration já cobre isso na prática,
mas o seed fica robusto mesmo rodando num banco só com schema aplicado
manualmente).

### Backend

- `Plan` (domain, em `application/ports/plan-repository.ts`) + repo Drizzle
  (`infra/db/repositories/plan.repository.ts`) — CRUD completo, sem hard
  delete (FK em uso por `workspaces`; em vez disso `setActive`).
- Use-cases admin: `list-plans`, `create-plan` (rejeita `key` duplicada),
  `update-plan` (nunca aceita mudar `key`), `deactivate-plan`/`activate-plan`
  — todos com audit log (`entity: 'plan'`).
- **Refinamento em relação ao plano original**: em vez de embutir o `Plan`
  inteiro dentro da entidade `Workspace` (o que mudaria o formato JSON de
  toda resposta de workspace consumida por mobile/dashboard), `Workspace`
  ficou só com `planId: string` — os 4 call-sites que precisam do limite
  buscam o `Plan` separadamente (`deps.repos.plan.findById`/`findByKey`).
  Bem menos invasivo: `listMyWorkspaces` (usado pelo seletor mobile/dashboard)
  continua devolvendo só `plan: string` (a `key`), sem quebrar nada rio abaixo.
- **Os 4 call-sites de `FREE_PLAN_LIMITS` migrados pro limite real do
  plano do workspace** (`create-workspace.ts`, `create-invite.ts`,
  `accept-invite.ts`, `create-saved-formula.ts`) — `domain/services/plan-limits.ts`
  perdeu a constante, ficou só com o tipo `PlanLimits` (re-exportado de
  `@finance/shared`) + helper `hasFeature(plan, key)`.
  - **Bônus descoberto durante a migração**: `create-saved-formula.ts`
    checava o limite `FREE_PLAN_LIMITS` incondicionalmente só quando
    `workspace.plan === 'free'` — qualquer workspace `premium` nunca tinha
    limite nenhum de fórmulas salvas, nunca de propósito. A migração corrige
    isso de graça (agora sempre consulta o limite real do plano, seja ele
    qual for).
  - Efeito colateral também corrigido: `create-invite`/`accept-invite`
    aplicavam o limite de membros só se `plan === 'free'` (premium era
    incondicionalmente ilimitado). Agora o limite de `premium` é real
    (generoso, mas finito) — ver seed abaixo.
- **Controle de plano por workspace** (pedido no meio da sessão):
  `list-workspaces.ts` (admin — dono, plano, nº de membros, paginado) +
  `set-workspace-plan.ts` (troca manual, audit log com `fromPlanId`/`toPlanId`).
  `WorkspaceRepository.listAllForAdmin` faz 3 queries batched (workspaces+plan
  via relation Drizzle, memberships em lote, owners em lote) — evita N+1.
  `list-users.ts` (`AdminUserView`) ganhou `planName` (plano do workspace
  pessoal do usuário, via `defaultWorkspaceId`).
- Rotas: `GET/POST /admin/plans`, `PATCH/POST /admin/plans/:id`,
  `:id/deactivate`, `:id/activate`, `GET /admin/workspaces`,
  `PATCH /admin/workspaces/:workspaceId/plan`. Zod em `admin/schemas.ts`.
  Novos `AdminError`: `plan_key_taken`, `plan_not_found`, `workspace_not_found`.
- `platform-metrics.repository.ts` ajustado (`workspacesByPlan` agora faz
  `join` com `plans` e agrupa por `plans.key`, já que o enum sumiu).

### Seed (dev)

`free`: 1 workspace compartilhado, 5 membros, 10 fórmulas (mesmos valores de
antes, agora reais). `premium`: R$ 49,90/mês, 5 workspaces, 20 membros, 50
fórmulas — antes não tinha limite nenhum (nunca era usado de verdade).

### Dashboard

- `admin-api.ts`: `listPlans`/`createPlan`/`updatePlan`/`deactivatePlan`/
  `activatePlan`/`listWorkspaces`/`setWorkspacePlan` + tipos espelhados
  (`PlanView`, `AdminWorkspaceView`).
- `/saas/plans` — CRUD completo (cards com preço formatado, intervalo,
  limites e features como chips; dialog de criar/editar; desativar/reativar
  em vez de excluir).
- `/saas/workspaces` — lista paginada (dono, plano+intervalo, nº de
  membros) + dialog "Mudar plano" (`<select>` dos planos ativos).
- `/saas/users` — badge de plano (do workspace pessoal) ao lado do nome.
- Nav do `saas/+layout.svelte`: "Workspaces" e "Planos" adicionados.

### Testes

`apps/backend/src/application/use-cases/admin/admin-plans.test.ts` (6 casos
novos): CRUD de planos + audit log, `key` duplicada rejeitada, listagem de
workspaces retorna dono/plano corretos, trocar o plano de um workspace muda
o limite aplicado **na hora** (fórmula que excedia o limite do plano
restritivo passa a ser aceita depois da troca pra um plano generoso),
rejeição de workspace/plano inexistente, e criação de workspace usando o
plano free real (não mais a constante).

`apps/backend/src/test/deps.ts` ganhou `getTestPlanId(db, key)` — os 4
arquivos de teste que faziam `db.insert(workspaces)` cru (`recurring.test.ts`,
`estimate-variable-expense.test.ts`, `export-transactions-csv.test.ts`,
`transaction.test.ts`) e o teste de `workspace.test.ts` que fazia upgrade
manual pra "premium" foram ajustados pra usar o plano real semeado pela
migration em vez do enum antigo.

## Validação final

- `bun run --filter=@finance/backend typecheck` — limpo.
- `bun test` (backend completo) — **209 pass, 0 fail** (incluindo os 6 casos
  novos de `admin-plans.test.ts`).
- `bun run lint` (Biome, monorepo) — limpo.
- `bun run --filter=mobile typecheck` — limpo (só precisou trocar o tipo
  `plan: WorkspacePlan` por `planId: string`/`plan: string` conforme o
  endpoint; nenhum código lia esse campo, confirmado por grep).
- Dashboard: `svelte-check` (0 erros, só os 5 warnings pré-existentes de
  outras rotas), `prettier --check` + `eslint` limpos, `build` de produção
  ok.
- **Smoke test real** contra backend (porta 3000) e dashboard (porta 5173)
  rodando: registrou usuário → promoveu a superadmin via SQL (processo
  documentado em `seed.ts`) → `POST /admin/plans` criou um plano novo →
  `GET /admin/workspaces` retornou dono+plano corretos → `PATCH
  /admin/workspaces/:id/plan` mudou o plano → `GET /admin/users` já refletia
  o novo `planName` na hora → páginas `/saas/plans` e `/saas/workspaces` do
  dashboard renderizaram os dados reais via SSR (confirmado lendo o HTML
  devolvido, não só status 200).

## Continuação: Stripe (fase 2, M5-03)

Fora de escopo aqui, por decisão do usuário. Quando entrar: os campos
`priceCents`/`billingIntervalUnit`/`billingIntervalCount` já mapeiam 1:1
pra `Price`/`interval`+`interval_count` do Stripe — só falta adicionar
`stripeProductId`/`stripePriceId` (nullable) em `plans`, um fluxo de
Checkout/Billing Portal, webhook de sincronização de assinatura, e substituir
a "recorrência" hoje estática (intervalo configurado) por estado real de
assinatura (próxima cobrança, status ativo/inadimplente/cancelado).
