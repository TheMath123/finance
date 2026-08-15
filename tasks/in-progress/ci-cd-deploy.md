# CI/CD — deploy do dashboard (Cloudflare) e da API (Fly.io), banco no Neon

**Status:** 🟡 Pipeline escrito e validado localmente (build do dashboard com o
adapter novo, `docker build` do backend). **Bloqueado pra deploy real** até o
usuário completar o checklist de contas/secrets abaixo — nenhuma dessas contas
existe ainda, e isso não pode ser automatizado por mim.

## Contexto

Até aqui só existia CI (`.github/workflows/ci.yml`): typecheck + migração
contra um Postgres efêmero do job + testes do backend, em push/PR pra `main`.
Não havia deploy automatizado — tudo local (docker compose + tunnel
cloudflared pra testar webhook do Stripe). O usuário pediu deploy pra
produção com 3 alvos (Cloudflare pro dashboard, Fly.io pra API, Neon pro
banco) e versionamento por tag Git independente por app.

4 decisões de arquitetura foram assumidas com a opção recomendada (perguntei
via AskUserQuestion, sem resposta a tempo — confirmar quando possível):

1. **Redis de produção** (BullMQ + rate limiter, não mencionado no pedido
   original) → **Upstash Redis** (serverless, `ioredis` aceita a URL
   `rediss://` sem mudança de código).
2. **Topologia no Fly** (backend tem 2 processos: HTTP e worker de fila) →
   **1 fly app, 2 process groups** (`[processes]` no `fly.toml`, mesma
   imagem Docker).
3. **Gate de deploy pra produção** → **aprovação manual** via GitHub
   Environment `production` com required reviewer, porque o deploy da API
   roda migração de banco real antes do `fly deploy`.
4. **Formato de tag** → semver completo nos dois:
   `dashboard-web-vMAJOR.MINOR.PATCH` e `api-vMAJOR.MINOR.PATCH`.

## O que foi implementado

- `.github/workflows/ci.yml` — adicionado `bun run lint` (Biome) e build do
  dashboard como smoke test do adapter novo.
- `apps/dashboard/vite.config.ts` + `package.json` — trocado
  `@sveltejs/adapter-node` por `@sveltejs/adapter-cloudflare`.
- `apps/dashboard/wrangler.toml` (novo) — `nodejs_compat` (necessário pro
  `$env/dynamic/private` funcionar no Workers), `[vars] API_URL` apontando
  pro backend.
- `.github/workflows/deploy-dashboard.yml` (novo) — dispara em tags
  `dashboard-web-v*`, builda e roda `wrangler deploy`.
- `apps/backend/Dockerfile` + `/.dockerignore` (novos) — multi-stage com
  `oven/bun`, contexto de build na **raiz do repo** (precisa ver os
  `packages/*` via workspace).
- `apps/backend/fly.toml` (novo) — 2 process groups (`web`/`worker`), health
  check em `/health`, `min_machines_running = 1` só no `web`.
- `.github/workflows/deploy-backend.yml` (novo) — dispara em tags `api-v*`,
  roda migração contra o Neon de produção, depois `flyctl deploy`.
  **Deliberadamente não roda a suíte de testes do backend** nesse workflow —
  os testes criam/apagam dados reais (users/workspaces/plans) e rodar isso
  contra `DATABASE_URL` de produção seria destrutivo; a suíte completa já
  roda no CI contra Postgres efêmero a cada push pra `main`.
- `scripts/release.ts` + `bun run release:dashboard` / `release:landing` /
  `release:api` (novo, mesmo padrão dos scripts de tunnel já existentes) — lê
  a última tag do prefixo certo, sobe o número (patch por padrão) e
  cria+empurra a tag. Exige working tree limpo e branch `main` antes de
  taggear.
- `apps/landing` (novo app, site institucional em `example.com` — dashboard
  fica em `dash.example.com`) — mesmo padrão do dashboard:
  `apps/landing/wrangler.toml` (`name = "marcelus-site"`),
  `.github/workflows/deploy-landing.yml` (dispara em tags `landingpage-v*`),
  `ci.yml` ganhou lint + build smoke test do app novo (turbo já cobre o
  typecheck automaticamente, sem mudança — `apps/*` é genérico nas tasks do
  `turbo.json`).

## Checklist de setup manual (só o usuário consegue fazer)

Nada disso eu consigo criar — são contas/tokens de serviços externos.

### Cloudflare (dashboard)

1. Criar o Worker (pode ser via `wrangler deploy` na primeira vez, que cria
   automaticamente, ou pelo painel) — o nome tem que bater com `name` em
   `apps/dashboard/wrangler.toml` (`marcelus-dashboard`).
2. Gerar um API Token com permissão **Workers Scripts:Edit** (Dashboard
   Cloudflare → My Profile → API Tokens).
3. Pegar o **Account ID** (aparece na barra lateral de qualquer domínio no
   painel).
4. No GitHub: Settings → Secrets and variables → Actions → adicionar
   `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.

### Cloudflare (landing)

Mesmo processo do dashboard acima, Worker separado:

1. Criar o Worker `marcelus-site` (via `wrangler deploy` na primeira vez ou
   pelo painel) — nome tem que bater com `name` em `apps/landing/wrangler.toml`.
2. Reaproveita os mesmos secrets `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`
   já configurados pro dashboard (mesma conta Cloudflare, token com permissão
   **Workers Scripts:Edit** cobre os dois Workers).

### Fly.io (backend)

1. `fly auth login` local, depois `fly apps create marcelus-app` (nome tem
   que bater com `app` em `apps/backend/fly.toml`).
2. Gerar um token de deploy: `fly tokens create deploy -a marcelus-app`.
3. No GitHub: adicionar secret `FLY_API_TOKEN`.
4. Setar os secrets do backend **uma vez**, direto no Fly (não ficam no
   GitHub — o Fly persiste entre deploys):
   ```
   fly secrets set \
     JWT_SECRET=... \
     DATABASE_URL=... \
     REDIS_URL=... \
     SMTP_HOST=smtp.resend.com SMTP_PORT=465 SMTP_USER=resend SMTP_PASS=... \
     MAIL_FROM="Finance <no-reply@seu-dominio>" \
     TERMS_VERSION=2026-07-13 \
     DASHBOARD_ORIGIN=https://marcelus-dashboard.<sua-conta>.workers.dev \
     WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_ACCESS_TOKEN=... WHATSAPP_VERIFY_TOKEN=... WHATSAPP_APP_SECRET=... \
     OPENROUTER_API_KEY=... \
     STORAGE_BUCKET=... STORAGE_ENDPOINT=... STORAGE_ACCESS_KEY_ID=... STORAGE_SECRET_ACCESS_KEY=... \
     STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... \
     -a marcelus-app
   ```
   (lista espelha `apps/backend/.env.example` — só falta o que já vem de
   Neon/Upstash, ver abaixo).

### Neon (banco)

1. Criar o projeto, copiar a **pooled connection string** (já vem com
   `?sslmode=require` — nenhuma mudança de código necessária).
2. No GitHub: adicionar secret `DATABASE_URL` (usado pra rodar a migração a
   partir do runner no workflow de deploy da API).
3. Mesma URL entra também no `fly secrets set` acima.

### Upstash (Redis)

1. Criar uma instância Redis (free tier serve pro começo).
2. Copiar a URL `rediss://...` e usar como `REDIS_URL` no `fly secrets set`
   acima.

### GitHub Environment

1. Repo → Settings → Environments → criar `production`.
2. Marcar **Required reviewers** (pelo menos você mesmo) — é o freio manual
   antes do deploy real acontecer, já que o job da API roda migração de
   banco antes do `fly deploy`.

### ⚠️ `.env` do dashboard precisa existir DENTRO de `apps/dashboard/`

Achado ao investigar o erro de deploy: existia (e ainda existe, propositalmente)
um `.env` na raiz do monorepo com `API_URL`/`PUBLIC_GOOGLE_CLIENT_ID`. O Bun
carrega esse arquivo automaticamente quando `bun run typecheck` é invocado a
partir da raiz, então esses valores acabam no `process.env` do processo pai —
mas o Vite/SvelteKit do dashboard resolve `$env/static/public` a partir do
`envDir` do próprio projeto Vite (`apps/dashboard`, já que não há `envDir`
customizado em `vite.config.ts`), **não herda esse `process.env`** pra gerar
os tipos ambient (`svelte-kit sync`). Resultado: o `.env` da raiz nunca teve
efeito real nenhum sobre o dashboard — só passava despercebido porque o Turbo
cacheia por hash de conteúdo de arquivo (não por env var), e um `typecheck`
antigo (de quando alguém rodou com o `.env` no lugar certo) ficava sendo
reproduzido via cache em vez de re-executado de verdade. Só apareceu com
`--force` (bypass de cache).

**Correção:** criado `apps/dashboard/.env` de verdade (mesmo conteúdo do
`.env.example`, valores reais). O `.env` da raiz do monorepo ficou como está
— não é usado pelo dashboard, mas não vale a pena mexer nele sem necessidade.
Se for criar env pública nova pro dashboard no futuro, o `.env` que importa é
sempre `apps/dashboard/.env`, e **sempre validar com `--force`** (bypassar
cache do Turbo) antes de considerar confirmado — cache hit não prova nada
sobre env var.

### Repository variable — `PUBLIC_GOOGLE_CLIENT_ID` (login social)

Env pública do dashboard (M5-06), lida via `$env/static/public` — resolvida
em **tempo de build**, não runtime. Se a chave não existir no ambiente do
runner, o SvelteKit nem gera o export e o `typecheck`/`build` quebra (foi o
erro visto num deploy real: `Module "$env/static/public" has no exported
member 'PUBLIC_GOOGLE_CLIENT_ID'`). Corrigido adicionando essa env aos jobs
de `ci.yml` e `deploy-dashboard.yml` — mas o valor em si só existe se você
configurar:

1. Repo → Settings → Secrets and variables → Actions → aba **Variables**
   (não Secrets — não é segredo, só identifica a origem autorizada no Google
   Cloud Console).
2. Adicionar `PUBLIC_GOOGLE_CLIENT_ID` com o mesmo Client ID já usado em
   `GOOGLE_CLIENT_IDS` no Fly (backend) e no `.env` local do dashboard.

Sem essa variable configurada, os workflows continuam passando (o valor cai
pra string vazia, e os componentes `google-sign-in-button.svelte`/
`google-link-button.svelte` já escondem o botão quando vazio) — só o botão de
login social é que não aparece em produção até isso ser configurado.

### Repository variable — `PUBLIC_CLARITY_PROJECT_ID` (analytics/heatmap)

Mesmo mecanismo do `PUBLIC_GOOGLE_CLIENT_ID` acima (env pública resolvida em
tempo de build via `$env/static/public`) — já nasceu com a env adicionada nos
2 workflows, pra não repetir o mesmo erro.

1. Criar o projeto em https://clarity.microsoft.com/ e pegar o Project ID.
2. Repo → Settings → Secrets and variables → Actions → aba **Variables** →
   adicionar `PUBLIC_CLARITY_PROJECT_ID`.
3. Mesmo valor entra em `EXPO_PUBLIC_CLARITY_PROJECT_ID` no `.env` do mobile
   (não passa por CI/build do GitHub — é embutido no build do EAS, fora
   deste runbook).

Sem configurar, o dashboard não injeta o script (nenhum erro, só sem
tracking) e o mobile não inicializa o SDK.

### Repository variable — `PUBLIC_APP_URL` (site institucional → dashboard)

Env pública do `apps/landing` (site institucional), mesmo mecanismo dos dois
acima (`$env/static/public`, resolvida em tempo de build) — usada pro botão
"Entrar" e as CTAs de "Criar conta"/"Assinar" apontarem pro dashboard
autenticado. Já nasceu com a env adicionada em `ci.yml` e
`deploy-landing.yml`.

1. Repo → Settings → Secrets and variables → Actions → aba **Variables**.
2. Adicionar `PUBLIC_APP_URL` com a URL pública do dashboard (ex.:
   `https://dash.example.com`, ou o `*.workers.dev` do dashboard enquanto o
   domínio real não existe).

Sem essa variable configurada, o `typecheck`/`build` do landing quebra (mesmo
erro de `$env/static/public` já visto com `PUBLIC_GOOGLE_CLIENT_ID`) — não é
opcional como os dois anteriores, porque o layout do landing importa direto,
sem checar se está vazia.

### Domínio customizado (pendente até o usuário decidir/comprar o domínio)

Enquanto isso, os dois Workers seguem em `*.workers.dev`. Quando o domínio
real existir:

1. Adicionar o domínio à conta Cloudflare (Zone).
2. `apps/dashboard/wrangler.toml` ganha `routes = [{ pattern =
   "dash.<dominio>/*", custom_domain = true }]`.
3. `apps/landing/wrangler.toml` ganha `routes = [{ pattern = "<dominio>/*",
   custom_domain = true }]`.
4. Atualizar `PUBLIC_APP_URL` (variable acima) e `[vars] PUBLIC_APP_URL` em
   `apps/landing/wrangler.toml` pro domínio real.

### Cortar uma release

Depois do checklist acima completo:

```
bun run release:dashboard        # patch por padrão: dashboard-web-v1.0.0, .1, ...
bun run release:landing minor    # landingpage-v1.0.0 → landingpage-v1.1.0
bun run release:api minor        # api-v1.0.0 → api-v1.1.0
```

Cada comando cria+empurra a tag, que dispara o respectivo workflow no GitHub
Actions — aguardando aprovação no Environment `production` antes do deploy
de verdade.

## Fora de escopo (não pedido nesta sessão)

- Deploy do mobile (EAS/Expo).
- Ambiente de staging/preview (Cloudflare Workers já suporta preview nativo;
  Fly precisaria de apps efêmeros — sessão separada se for pedido).
- Domínio customizado — usando `*.workers.dev`/`*.fly.dev` até decisão do
  usuário.

## Verificação feita

- `bun run build --filter=@finance/dashboard` com o `adapter-cloudflare` novo
  — build local com sucesso.
- `bun --cwd=apps/landing run lint` + `bunx turbo run typecheck
  --filter=@finance/landing --force` + `bunx turbo run build
  --filter=@finance/landing --force` — todos limpos.
- `docker build` local do `apps/backend/Dockerfile` (contexto na raiz) — ver
  seção de validação final desta sessão.
- Não foi possível validar `wrangler deploy`/`flyctl deploy` ponta a ponta —
  depende das contas do checklist acima existirem.
