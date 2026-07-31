# M5-05 — Integração Stripe (checkout + Customer Portal) e autoatendimento de plano

**Status:** 🟢 Concluída (2026-07-31), validada ponta a ponta contra backend
+ dashboard rodando. **Smoke test real com Stripe (chaves de teste, `stripe
listen`, cartão de teste) segue pendente** — a conta Stripe ainda não existe;
isso está documentado como próximo passo obrigatório antes de considerar o
gateway "ligado" de verdade em qualquer ambiente.

## Contexto

M5-02/M5-03 deixaram o modelo de planos/preços/trial pronto, mas cobrança
continuava 100% manual pelo superadmin — sem gateway de pagamento, sem forma
do próprio usuário assinar/trocar/cancelar um plano (M5-04, que tinha ficado
só documentado no backlog). Nesta sessão o usuário decidiu integrar o Stripe
e implementar o M5-04 junto, absorvendo-o aqui.

Decisões fechadas com o usuário antes de implementar (via AskUserQuestion):

- **Conta Stripe ainda não existe** — toda a integração foi escrita com envs
  lazy-validadas (`infra/stripe/env.ts`, mesmo padrão de WhatsApp/IA: só
  falha no primeiro uso real, nunca trava o boot do backend) e um
  `FakePaymentGateway` pros testes, pra não depender de chave real pra
  escrever/validar a lógica de negócio.
- **Stripe Checkout hospedado** (não Stripe Elements) pro primeiro checkout.
- **Stripe Customer Portal hospedado** pra gerenciar assinatura já ativa
  (trocar plano, cancelar, atualizar cartão) — em vez de UI customizada.
  Isso reduziu drasticamente o M5-04: dashboard e mobile só precisam de uma
  tela "Meu plano"/"Assinatura" com **um botão** (assinar OU gerenciar).
- **Cancelamento no fim do período pago** (`cancel_at_period_end`) — padrão
  de mercado, nativo do Stripe via Portal.
- Cartão + Pix habilitados no Checkout (decisão de sessão anterior); boleto
  fora por ora.

## Implementação

### Schema (migration única, aditiva)

`plans.stripeProductId`, `plan_prices.stripePriceId` (nullable, sincronizados
**lazy** — só criados no Stripe no primeiro checkout daquele plano/preço, sem
passo de sincronização em massa). `workspaces` ganha `stripeCustomerId`,
`stripeSubscriptionId`, `subscriptionStatus` (novo enum
`none|trialing|active|past_due|canceled|incomplete`, default `none`),
`cancelAtPeriodEnd` (boolean), `currentPeriodEndsAt` (timestamp — fim do
período já pago, exibido quando `cancelAtPeriodEnd` for true). `trialEndsAt`
do M5-03 continua servindo o trial atribuído manualmente pelo superadmin;
quem assina via Checkout tem esse campo espelhado via webhook também.

### Backend

- `application/ports/payment-gateway.ts` — porta estreita
  (`PaymentGateway`/`PaymentEvent`), sem vazar tipos do SDK do Stripe pra
  camada de aplicação. `infra/stripe/stripe-gateway.ts` (pacote `stripe`)
  traduz os webhooks brutos pros 3 tipos de evento que importam
  (`checkout.session.completed`, `subscription.updated` — cobre também
  `customer.subscription.created`, mesmo shape —, `subscription.deleted`);
  qualquer outro webhook vira `{ type: 'ignored' }`.
  `infra/stripe/fake-payment-gateway.ts` — ids determinísticos, usado nos
  testes via `UseCaseDeps.payments`.
- `domain/services/resolve-effective-plan.ts` estendido:
  `subscriptionStatus === 'canceled'` (cancelamento real via Stripe) tem
  prioridade sobre o `trialEndsAt` vencido do M5-03 — os dois mecanismos
  coexistem sem se atropelar.
- `application/use-cases/billing/` (pasta nova, não-admin):
  `list-available-plans.ts` (`GET /plans`, qualquer autenticado),
  `get-billing-status.ts` (status de cobrança do workspace atual, qualquer
  membro pode ver), `start-checkout.ts` (owner-only; sincroniza lazy
  Product/Price/Customer e cria a Checkout Session com
  `subscription_data.trial_period_days` vindo de `plan.trialDays`),
  `start-billing-portal.ts` (owner-only; exige `stripeCustomerId`),
  `sync-stripe-webhook-event.ts` (processa os 3 tipos de evento, dedup por
  `event.id` via `deps.cache` — mesmo padrão do dedup por `wamid` do
  webhook do WhatsApp, M2-06).
- `WorkspaceRepository` ganha `findByStripeCustomerId`/
  `findByStripeSubscriptionId`/`updateSubscriptionState` (distinto do
  `updatePlan` do M5-03, que é atribuição manual do superadmin).
  `PlanRepository` ganha `setStripeProductId`/`setStripePriceId`/
  `findPriceByStripePriceId` (troca de plano pelo Portal precisa mapear o
  `price.id` do Stripe de volta pro nosso `plan_price`).
- Rotas (`http/modules/billing/`): `GET /plans`, `GET
  /workspaces/:id/billing`, `POST /workspaces/:id/billing/checkout`, `POST
  /workspaces/:id/billing/portal` (todas via `requireWorkspaceRole`, as 2
  últimas exigem `owner`), `POST /webhooks/stripe` (sem guard — igual ao
  webhook do WhatsApp, a "autenticação" é a verificação de assinatura
  `stripe-signature` dentro do handler; processado síncrono, diferente do
  WhatsApp que enfileira porque dispara IA).
- **Bug pego pelo smoke test do M5-03 não se repetiu aqui**, mas o mesmo
  cuidado foi tomado: todas as rotas usam `:workspaceId` (nunca outro nome
  de parâmetro na mesma posição), evitando a colisão Elysia/memoirist já
  vista antes.

### Dashboard

- `lib/server/workspace-api.ts` ganha `listAvailablePlans`,
  `getBillingStatus`, `startCheckout`, `startBillingPortal` + tipos
  espelhados.
- Nova aba "Assinatura" no layout de `/workspace/*`. Nova rota
  `/workspace/plan`: sem assinatura, lista os planos pagos com seletor de
  preço + botão "Assinar"; com assinatura, mostra status + botão "Gerenciar
  assinatura". Ambas as actions fazem `redirect(303, url)` pra fora do
  domínio — **primeiro redirect externo da dashboard**, documentado no
  código como precedente novo.

### Mobile

- `lib/workspace-api.ts` ganha as mesmas 4 funções.
- Nova tela `app/(app)/workspaces/[workspaceId]/plan.tsx` — card read-only
  (molde `variable-expense.tsx`) + `Dialog` de seleção de plano/preço (molde
  `members.tsx`) ou botão direto "Gerenciar assinatura". Abre a URL via
  `WebBrowser.openAuthSessionAsync(url, 'mobile://billing-return')` — API
  nova pro projeto (antes só existia `openBrowserAsync` sem tratamento de
  retorno); o `scheme` `mobile` já existia no `app.json`, reaproveitado como
  deep link de retorno.
- Link "Assinatura" adicionado em `workspaces/index.tsx`, ao lado de
  "Membros"/"Atividade", visível só pra quem já podia gerenciar o workspace.

### Testes

`application/use-cases/billing/billing.test.ts` (6 casos, com o
`FakePaymentGateway`, sem depender de chave real): `startCheckout`
sincroniza `stripeProductId`/`stripePriceId` lazy e devolve URL; rejeita
plano/preço inexistente; `startBillingPortal` recusa sem `stripeCustomerId`;
webhook `checkout.session.completed` liga customer/subscription ao
workspace certo; dedup por `event.id` (mesmo `id` reenviado com dados
diferentes não reaplica); `subscription.deleted` marca `canceled` e
`resolveEffectivePlan` passa a devolver o plano free **mesmo com o `planId`
do workspace ainda apontando pro plano pago** — prova que o fallback via
`subscriptionStatus` é independente do `trialEndsAt`.

## Validação final

- `bun run --filter=@finance/backend typecheck` — limpo.
- `bun test` (backend completo) — **219 pass, 0 fail**.
- `bun run lint` (Biome, monorepo) — limpo.
- Dashboard: `svelte-check` (0 erros), `prettier --check` + `eslint`
  limpos, `build` de produção ok.
- Mobile: `typecheck` e `lint` limpos (precisou regenerar
  `.expo/types/router.d.ts`, artefato local gitignored, pra reconhecer a
  rota nova `[workspaceId]/plan`).
- **Smoke test real** contra backend (3000) + dashboard (5173) rodando:
  `GET /plans` e `GET /workspaces/:id/billing` retornaram dados reais;
  `/workspace/plan` renderizou via SSR mostrando plano atual, status "Sem
  assinatura" e botão "Assinar" (confirmado lendo o HTML devolvido);
  `POST .../billing/checkout` sem chave Stripe configurada devolveu um 500
  tratado (`internal_error`, sem vazar detalhe interno) e **o backend
  continuou de pé** depois — comportamento correto e esperado nesta fase
  sem conta Stripe ainda.

## Continuação (bloqueado até o usuário criar a conta Stripe)

1. Criar conta Stripe (modo teste), pegar `STRIPE_SECRET_KEY` e configurar
   webhook (`stripe listen --forward-to localhost:3000/webhooks/stripe`
   localmente, copiar o `STRIPE_WEBHOOK_SECRET` que o comando imprime).
2. Configurar o Customer Portal uma vez no Dashboard do Stripe (Settings →
   Billing → Customer portal) — quais planos aparecem como opção de troca
   lá dentro.
3. Smoke test real: assinar um plano de teste via Checkout (cartão
   `4242 4242 4242 4242`), confirmar que o webhook atualiza o workspace,
   abrir o Portal e cancelar, confirmar `cancelAtPeriodEnd` na tela e que o
   acesso só cai depois do `subscription.deleted` de verdade (ou simulado
   via `stripe trigger customer.subscription.deleted`).
4. Fora de escopo por ora: boleto, configuração automatizada do Customer
   Portal via API (feita manualmente uma vez), lock distribuído contra
   corrida rara de duplo-create de Product/Price em checkouts simultâneos
   do mesmo plano/preço nunca sincronizado antes (risco aceito de MVP).
