# M5-03 — Preços múltiplos por plano, trial configurável e feature-lock unificado com feature flags

**Status:** 🟢 Concluída (2026-07-30, validada ponta a ponta com curl real contra
backend + dashboard rodando)

## Contexto

O M5-02 entregou a tabela `plans` com **um único preço/intervalo fixo por plano**
(`priceCents` + `billingIntervalUnit` + `billingIntervalCount` como colunas soltas).
Revisando o resultado, o usuário quis um modelo mais próximo do real: um plano
(ex. "Started") com **múltiplas opções de cobrança** (mensal, semestral, anual,
cada uma com seu preço e parcelamento), um **trial configurável por plano**
(acesso completo por N dias antes de exigir confirmação de pagamento) e
unificação entre o array `plans.features` (M5-02, sem consumidor real) e a
tabela `feature_flags` (M4-09, kill-switch global).

Decisões fechadas com o usuário antes de implementar (via AskUserQuestion):

- **Só modelo de dados** — sem gateway de pagamento real (Stripe etc.) neste
  item. Campos de preço/parcelamento/métodos servem pra exibir e já ficam
  prontos pra mapear 1:1 pro Stripe depois.
- **Cancelamento automático por inadimplência fica de fora** — sem gateway
  real não tem como saber se o usuário pagou; adiado até existir integração
  real.
- **Trial é diferente disso e entrou agora** — expiração de trial é só
  baseada em tempo (`workspaces.trialEndsAt`), não depende de status de
  pagamento. Quando o trial vence, os checks de limite/feature caem pro plano
  free automaticamente (sem job/cron — calculado on-the-fly a cada leitura).
- **Unificar vocabulário**: `plans.features` só pode conter chaves que
  existem em `feature_flags` — acesso final a uma feature = está no array do
  plano efetivo **e** a flag global está `enabled`.
- Numeração: continuação do M5 → **M5-03**. Autoatendimento (usuário comum
  ver/trocar o próprio plano) documentado à parte, sem implementar
  (`tasks/backlog/m5-04-autoatendimento-troca-plano-usuario.md`).

## Implementação

### Schema (`packages/db/src/schema/plan.ts`, `workspace.ts`)

Nova tabela `plan_prices`: `planId` (FK cascade), `billingIntervalUnit`/
`billingIntervalCount` (mesmo enum `billing_interval` do M5-02),
`priceCents`, `maxInstallments` (parcelamento via cartão — 1 no mensal, até
12 no anual), `paymentMethods` (jsonb, `['credit_card','debit_card','pix']`
por padrão — hoje só metadado, sem gateway real), `isDefault`, `sortOrder`.
Unique constraint em `(planId, billingIntervalUnit, billingIntervalCount)`.

`plans` perde `priceCents`/`billingIntervalUnit`/`billingIntervalCount`
(viram N linhas em `plan_prices`) e ganha `trialDays` (0 = sem trial).

`workspaces` ganha `planPriceId` (FK nullable, `on delete set null` — qual
opção de cobrança o workspace está) e `trialEndsAt` (timestamp nullable —
no passado = trial vencido).

Migration em **2 estágios** (mesma técnica do M5-02, evita o prompt
interativo do `drizzle-kit` por ambiguidade de rename):
1. `0026_vengeful_carlie_cooper.sql` — cria `plan_prices` + `payment_method`
   enum, adiciona `plans.trial_days`, `workspaces.plan_price_id`/
   `trial_ends_at`, mantendo as 3 colunas antigas de preço temporariamente
   **+ backfill hand-written**: 1 `plan_price` por plano existente a partir
   das colunas antigas (`isDefault: true`), e `workspaces.plan_price_id`
   apontando pro price default do plano atual do workspace.
2. `0027_melodic_doorman.sql` — dropa as 3 colunas antigas de `plans` (o
   enum `billing_interval` continua existindo, agora só usado por
   `plan_prices` — sem ambiguidade de rename).

`packages/db/src/seed.ts`: `free` ganha 1 `plan_price` (R$ 0, mensal,
default) e `trialDays: 0`; `premium` vira o exemplo "Started" completo — 3
`plan_prices` (mensal R$ 49,90, semestral R$ 269,90 com `maxInstallments: 6`,
anual R$ 479,90 com `maxInstallments: 12`) e `trialDays: 7`.

### Backend

- `Plan` (port) agora embute `prices: PlanPrice[]` (relation Drizzle
  `with: { prices: true }`, ordenado por `sortOrder` em JS) — seguro porque
  `Plan`/`PlanView` só é consumido pelo admin/dashboard, nenhum endpoint de
  mobile serializa um `Plan` completo (confirmado por grep antes de mudar o
  formato).
- `PlanRepository` ganha `addPrice`/`updatePrice`/`deletePrice`/
  `findPriceById`/`clearDefaultPrice`/`countPricesForPlan`. Use-cases admin
  novos: `add-plan-price.ts` (recusa intervalo duplicado, desmarca o
  default anterior se `isDefault: true`), `update-plan-price.ts` (mesma
  lógica de default + recusa clash de intervalo), `delete-plan-price.ts`
  (recusa excluir o último price do plano).
- `domain/services/resolve-effective-plan.ts` (novo): `isTrialExpired`
  (`trialEndsAt` setado e no passado), `resolveEffectivePlan` (cai pro plano
  `free` se o trial venceu, senão retorna o plano atual do workspace) e
  `hasFeatureAccess` (entitlement do plano efetivo **e** feature flag global
  ligada — o "unifica" pedido). Os 3 call-sites que liam
  `plan.findById(workspace.planId)` direto (`create-invite.ts`,
  `accept-invite.ts`, `create-saved-formula.ts`) passaram a usar
  `resolveEffectivePlan` — um workspace com trial vencido cai automaticamente
  nos limites do free, sem nenhum job/cron.
- `create-plan.ts`/`update-plan.ts`: antes de gravar, cada string em
  `input.features` precisa existir em `feature_flags` (`findByKey`) — senão
  `unknown_feature_key` (novo `AdminError`, 422).
- `set-workspace-plan.ts` (estendido): aceita `planPriceId?` opcional (se
  omitido, usa o price `isDefault` do plano); se o plano mudou e o novo tem
  `trialDays > 0`, calcula `trialEndsAt = now + trialDays`; se o plano não
  mudou, mantém o `trialEndsAt` atual.
- `confirm-workspace-payment.ts` (novo): zera `trialEndsAt` — marca o
  workspace como "pagamento confirmado" antes do prazo, dado que não existe
  gateway real ainda pra detectar isso automaticamente.
- Rotas novas: `POST/PATCH/DELETE /admin/plans/:id/prices(/:priceId)`,
  `POST /admin/workspaces/:workspaceId/confirm-payment`. `setWorkspacePlanSchema`
  ganhou `planPriceId` opcional.
  - **Bug pego pelo próprio smoke test**: a rota aninhada
    `/admin/plans/:planId/prices/:priceId` colidia com a já existente
    `/admin/plans/:id` (memoirist/Elysia não aceita dois nomes de parâmetro
    diferentes na mesma posição de rota) — o backend recusava subir
    (`Cannot create route ... with parameter "planId" because a route
    already exists with a different parameter name ("id")`). Corrigido
    renomeando o param pra `:id` em todas as rotas de `plan_prices`, igual
    às rotas de plano já existentes.
- `register.ts`/`create-workspace.ts`: ao criar o workspace no plano free,
  também resolvem o `plan_price` default do free e gravam em `planPriceId`
  (nunca fica "sem preço escolhido" pra workspaces novos).

### Dashboard

- `admin-api.ts`: `PlanView`/`PlanInput` sem os 3 campos de preço, com
  `trialDays` e `prices: PlanPriceView[]`; `AdminWorkspaceView` ganhou
  `planPrice`/`trialEndsAt`; funções novas `addPlanPrice`/`updatePlanPrice`/
  `deletePlanPrice`/`confirmWorkspacePayment`.
- `/saas/plans`: cada card lista as opções de preço como chips com
  editar/excluir inline (dialog de add/edit reutilizado via snippet
  `priceFields`); campo `trialDays`; `features` deixou de ser texto livre
  separado por vírgula e virou multi-select carregado de
  `listFeatureFlags` (o `load()` busca as duas listas em paralelo).
- `/saas/workspaces`: badge de recorrência mostra `plan.name` + intervalo do
  `planPrice` escolhido; badge extra de trial ("trial até dd/mm" ou "trial
  venceu em dd/mm") quando há `trialEndsAt`; botão "Confirmar pagamento"
  aparece só quando há trial ativo; dialog "Mudar plano" ganhou um segundo
  `<select>` com as opções de preço do plano escolhido (reativo via
  `$derived`).
  - **Bug de pluralização pego no smoke test visual**: `${count} ${LABEL}s`
    produzia "6 mêss" pro intervalo semestral (mês + "s" não é o plural
    certo em português). Corrigido com um mapa `INTERVAL_LABELS_PLURAL`
    dedicado (`mês → meses`, `dia → dias`, etc.) em vez de concatenar "s".

### Testes

`admin-plans.test.ts` reescrito: `draftPlanInput` não tem mais campos de
preço (viraram `addPlanPrice` isolado); casos novos — CRUD de `plan_prices`
(unicidade de intervalo, desmarcar default anterior, recusa de excluir o
último price), `unknown_feature_key` rejeitado na criação (e aceito depois
de cadastrar a feature flag), trial: atribuir plano com `trialDays > 0`
inicia o trial e, uma vez forçado pro passado direto no banco (sem esperar
os dias de verdade), o limite aplicado volta a ser o do plano free real
(criadas 11 fórmulas sob o plano generoso em trial, a 12ª é bloqueada após o
trial vencer porque o free real tem limite 10), `confirmWorkspacePayment`
zera o trial.

## Validação final

- `bun run --filter=@finance/backend typecheck` — limpo.
- `bun test` (backend completo) — **213 pass, 0 fail**.
- `bun run lint` (Biome, monorepo) — limpo (auto-fix de formatação aplicado
  em vários arquivos tocados).
- Dashboard: `svelte-check` (0 erros, só os 5 warnings pré-existentes de
  outras rotas), `prettier --check` + `eslint` limpos, `build` de produção
  ok.
- **Smoke test real** contra backend (porta 3000) e dashboard (porta 5173)
  rodando: registrou usuário → promoveu a superadmin → `POST /admin/plans`
  criou o plano "Started" → 3x `POST /admin/plans/:id/prices` (mensal
  R$99,90, semestral R$539,90/6x, anual R$959,90/12x) → `GET /admin/plans`
  confirmou os 3 preços embutidos → `PATCH /admin/workspaces/:id/plan`
  atribuiu o plano e confirmou `trialEndsAt` setado pra +7 dias com
  `planPriceId` já resolvido pro default (mensal) → `POST
  .../confirm-payment` zerou o trial → tentativa de criar plano com feature
  inexistente devolveu `unknown_feature_key` real → páginas `/saas/plans` e
  `/saas/workspaces` renderizaram via SSR os dados reais (confirmado lendo o
  HTML devolvido). Dois bugs reais foram pegos e corrigidos só por causa
  desse smoke test ponta a ponta (colisão de rota Elysia/memoirist e
  pluralização "mêss") — nenhum dos dois apareceria em typecheck/lint/testes
  isolados.

## Continuação

- **M5-04 (backlog, não implementado)**: autoatendimento — usuário comum ver
  e trocar o próprio plano, mobile + dashboard fora do namespace `/saas/*`.
  Ver `tasks/backlog/m5-04-autoatendimento-troca-plano-usuario.md`.
- **Stripe / gateway real**: os campos `priceCents`/`billingIntervalUnit`/
  `billingIntervalCount` de `plan_prices` já mapeiam 1:1 pra
  `Price`/`interval`+`interval_count` do Stripe; falta `stripeProductId`/
  `stripePriceId` (nullable), fluxo de Checkout/Billing Portal, webhook de
  sincronização e substituir a confirmação manual de pagamento (hoje um
  botão de superadmin) por estado real de assinatura vindo do gateway —
  nesse momento também dá pra reativar o cancelamento automático por
  inadimplência que ficou de fora aqui.
