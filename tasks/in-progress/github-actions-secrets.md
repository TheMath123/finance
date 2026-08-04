# Secrets a configurar no GitHub Actions

Repo → **Settings → Secrets and variables → Actions → New repository secret**
(ou secrets de Environment, se preferir escopar só pro `production` — ver nota
no fim). Lista completa das envs que os workflows de deploy usam.

## `deploy-dashboard.yml` (dispara em tags `dashboard-web-v*`)

| Secret | De onde vem | Pra quê serve |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → criar um com permissão **Workers Scripts:Edit** | Autentica o `wrangler deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | Painel Cloudflare → barra lateral de qualquer domínio/conta | Identifica em qual conta Cloudflare publicar o Worker |

## `deploy-backend.yml` (dispara em tags `api-v*`)

| Secret | De onde vem | Pra quê serve |
|---|---|---|
| `DATABASE_URL` | Neon → connection string **pooled** do projeto de produção (já vem com `?sslmode=require`) | Roda `drizzle-kit migrate` a partir do runner, antes do deploy |
| `FLY_API_TOKEN` | `fly tokens create deploy -a finance-guide-api` (local, depois de `fly apps create`) | Autentica o `flyctl deploy` |

## Não vão pro GitHub (ficam só no Fly, setados uma vez)

O resto das envs do backend (`JWT_SECRET`, `REDIS_URL`, `SMTP_*`,
`WHATSAPP_*`, `OPENROUTER_API_KEY`, `STORAGE_*`, `STRIPE_*`,
`DASHBOARD_ORIGIN`, `TERMS_VERSION`) **não** são secrets do GitHub — o Fly
persiste secrets entre deploys, então bastam ser setadas uma vez direto lá:

```
fly secrets set JWT_SECRET=... REDIS_URL=... SMTP_HOST=... -a finance-guide-api
```

Lista completa + comando pronto em `tasks/in-progress/ci-cd-deploy.md`.

## GitHub Environment `production`

Não é bem um "secret", mas é obrigatório pro gate de aprovação manual que os
2 workflows usam (`environment: production`):

1. Repo → Settings → Environments → **New environment** → nome `production`.
2. Marcar **Required reviewers** (você mesmo, no mínimo).

Sem esse Environment criado, os workflows de deploy vão falhar ao tentar
rodar (referência a um Environment inexistente).

## Resumo — só 4 secrets no GitHub

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
DATABASE_URL
FLY_API_TOKEN
```

Se preferir, dá pra criar esses 4 direto dentro do Environment `production`
(Settings → Environments → production → Environment secrets) em vez de
secrets do repo inteiro — mais restrito, só os workflows que usam esse
Environment enxergam.
