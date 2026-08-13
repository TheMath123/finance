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
- `scripts/release.ts` + `bun run release:dashboard` / `release:api` (novo,
  mesmo padrão dos scripts de tunnel já existentes) — lê a última tag do
  prefixo certo, sobe o número (patch por padrão) e cria+empurra a tag. Exige
  working tree limpo e branch `main` antes de taggear.

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

### Cortar uma release

Depois do checklist acima completo:

```
bun run release:dashboard        # patch por padrão: dashboard-web-v1.0.0, .1, ...
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
- `docker build` local do `apps/backend/Dockerfile` (contexto na raiz) — ver
  seção de validação final desta sessão.
- Não foi possível validar `wrangler deploy`/`flyctl deploy` ponta a ponta —
  depende das contas do checklist acima existirem.
