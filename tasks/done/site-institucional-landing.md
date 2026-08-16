# Site institucional (`apps/landing`) + i18n + páginas legais

**Status:** 🟡 Implementado e validado localmente (lint+typecheck+build).
**Bloqueado pra deploy real** pelo mesmo checklist externo de
[[ci-cd-deploy]] (Worker Cloudflare `marcelus-site` + repository variable
`PUBLIC_APP_URL` + domínio real, quando existir).

## Contexto

O dashboard (`apps/dashboard`) é autenticado — quem chega sem conta só vê a
tela de login. Não existia site público/institucional. Pedido do usuário:
domínio raiz (`example.com`, placeholder até ele decidir o domínio real) vira
site institucional, dashboard sobe pro subdomínio `dash.example.com`, botão
"Entrar" no topo leva pro dashboard, página de Planos puxa os planos reais do
backend — tudo em SvelteKit SSR pra nunca vazar a URL da API no bundle do
client (mesmo padrão do dashboard: `lib/server/env.ts` +
`lib/server/*-api.ts`, env privada sem prefixo `PUBLIC_`).

Depois, escopo expandido pra: internacionalização (PT/EN/ES) e páginas de
Política de Privacidade e Termos de Serviço.

## Achado durante a investigação: `GET /plans` exigia login sem usar o `actor`

`list-available-plans.ts` nunca lia `actor` — só filtrava `isActive = true
AND isPrivate = false` na própria query do repositório. O
`requireAuthenticated` na rota era uma barreira artificial, não
personalização nenhuma. Removido — rota ficou pública de verdade, sem quebrar
o dashboard (que continua mandando o token, agora só ignorado nessa rota).

## O que foi implementado

### Backend (mínimo)

- `apps/backend/src/http/modules/billing/routes/plans.ts` — removido
  `requireAuthenticated`, rota pública.
- `apps/backend/src/application/use-cases/billing/billing.test.ts` — 2 testes
  novos confirmando que `listAvailablePlans` funciona sem `actor`/token e que
  plano desativado continua excluído.
- `docs/api/fragments/billing.json` — removida `security` de `/plans`,
  descrição atualizada, campo `isPrivate` (gap encontrado) documentado no
  schema `BillingPlan`.

### App novo `apps/landing`

Scaffold próprio (não reaproveita o `apps/dashboard` em runtime, só copia o
padrão): SvelteKit 2.70 + `@sveltejs/adapter-cloudflare`, Tailwind v4 (mesma
paleta/tokens do dashboard — `layout.css` copiado), sem shadcn-svelte/bits-ui
(mais enxuto, marketing estático + uma página com dado dinâmico).

- `src/lib/server/env.ts` — `API_URL` privada (Zod, `$env/dynamic/private`).
- `src/lib/server/plans-api.ts` — `listPublicPlans()`, chama `GET /plans` sem
  token (rota já é pública).
- `PUBLIC_APP_URL` — env pública, só pra montar os links do dashboard
  (`${PUBLIC_APP_URL}/login`, `/register`).

### i18n (PT/EN/ES) — decisão de arquitetura

Sem lib (Paraglide/svelte-i18n) dado o tamanho pequeno do site (4 páginas):

- `src/params/lang.ts` — param matcher `[lang=lang]` restringindo a
  `pt|en|es`.
- `src/routes/+page.server.ts` (raiz, sem lang) — redireciona `/` pro idioma
  certo via `Accept-Language` (default `pt`).
- `src/routes/[lang=lang]/+layout.ts` — expõe `{ lang }` pras páginas
  filhas.
- `src/lib/i18n/messages.ts` — dicionário `Record<Lang, Messages>` (nav,
  footer, home, pricing), consumido via `$derived(MESSAGES[data.lang])`.
- Todos os 3 idiomas com prefixo de rota (`/pt`, `/en`, `/es` — sem default
  sem prefixo).

### Páginas

1. **`/[lang]`** (Home) — hero, destaques (contas/cartões, fórmulas,
   split, import CSV, assistente WhatsApp, recorrências), banner final.
2. **`/[lang]/pricing`** — `+page.server.ts` chama `listPublicPlans()`,
   cards de preço (free + planos pagos com `formatCents` + label de
   intervalo), CTA "Assinar"/"Criar conta grátis" pro dashboard.
3. **`/[lang]/privacy`** e **`/[lang]/terms`** — `src/lib/i18n/legal-content.ts`
   (dicionário `LegalPage` PT/EN/ES). **Conteúdo é rascunho** — precisa
   revisão jurídica antes de publicar (dado sensível: dados financeiros são
   "dado sensível" sob a LGPD, e o produto integra Stripe, Meta/WhatsApp
   Cloud API, OpenRouter, Google OAuth e Microsoft Clarity — cada
   integração precisa estar corretamente descrita).
4. Layout com header (logo, nav Planos, seletor de idioma, botão Entrar) e
   footer (links + Entrar/Criar conta).

### Deploy (mesmo padrão do dashboard)

- `apps/landing/wrangler.toml` — Worker `marcelus-site`.
- `.github/workflows/deploy-landing.yml` — dispara em tags `landingpage-v*`.
- `scripts/release.ts` — target `landing` (`bun run release:landing`).
- `.github/workflows/ci.yml` — `PUBLIC_APP_URL` no env do job, lint do
  landing, build smoke test.
- `tasks/in-progress/ci-cd-deploy.md` — seções novas (Worker
  `marcelus-site`, repository variable `PUBLIC_APP_URL`, domínio
  customizado pendente).

## Fora de escopo (não pedido)

- Domínio customizado de verdade (rota Cloudflare + DNS) — documentado como
  pendência manual.
- Formulário de contato, blog, newsletter, prova social real.
- Qualquer autenticação no site — é 100% público.
- Revisão jurídica do conteúdo de Privacidade/Termos — sinalizado no código
  como rascunho, fora do escopo de um agente de código.

## Verificação feita

- `bun --cwd=apps/landing run lint` (prettier + eslint) — limpo.
- `bunx turbo run typecheck --filter=@finance/landing --force` — 0 erros.
- `bunx turbo run build --filter=@finance/landing --force` — build +
  adapter Cloudflare com sucesso.
- Backend: `bun test` (324/324, suíte completa) + `bunx turbo run typecheck
  --force` (10/10 pacotes) — ambos limpos.
- Não foi feito smoke test manual (`bun run dev`) nem deploy real — depende
  do checklist externo em [[ci-cd-deploy]].

## Bug pré-existente encontrado e corrigido (não relacionado ao landing)

Rodando a suíte completa do backend durante a validação, 3 testes de
`auth.test.ts` falhavam (`verificar e-mail`, `forgot-password` cooldown,
`lockout progressivo`) com `TypeError: expected blob, string or buffer` em
`jose-token-service.ts` (`hashOpaque`). Não era bug do Bun/CryptoHasher: o
job `email.verify-email` (ver `register.ts`) mudou de payload `{ code }` pra
`{ to, name, verifyUrl }` (token embutido na query string do link clicável,
não mais solto) em algum momento anterior, mas os testes continuaram
extraindo `(payload as { code: string }).code` — o cast `as` escondeu o
descompasso do TypeScript, e em runtime isso virava `undefined`, quebrando
o hash. Corrigido com um helper `tokenFromVerifyJob()` em `auth.test.ts` que
extrai o token de `new URL(verifyUrl).searchParams.get('token')`. Suíte
completa: 324/324 depois do fix.
