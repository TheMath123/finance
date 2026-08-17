<div align="center">
  <img src="assets/marcelus-original.svg" alt="Marcelus" width="140" />

  # Marcelus

  **Organização financeira pessoal e compartilhada — sem fricção, direto do WhatsApp.**

  [![CI](https://github.com/TheMath123/finance/actions/workflows/ci.yml/badge.svg)](https://github.com/TheMath123/finance/actions/workflows/ci.yml)
  ![Bun](https://img.shields.io/badge/runtime-Bun-fbf0df?logo=bun&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178c6?logo=typescript&logoColor=white)
  ![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
</div>

> **Marcelus** é apelido/codinome de projeto — o nome final do produto ainda não foi confirmado.

---

## O que é

Marcelus é um ecossistema de organização financeira pessoal e compartilhada, composto por **app mobile**, **dashboard web** e um **chatbot no WhatsApp** — todos consumindo o mesmo backend. A proposta central é reduzir o atrito de registrar e entender a própria vida financeira: o usuário lança uma transação mandando uma mensagem de WhatsApp (*"gastei 50 no mercado no nubank"*), abrindo o app, ou pelo navegador, e o sistema interpreta, categoriza e organiza tudo automaticamente.

### O problema

Apps de finanças pessoais no Brasil resolvem parte do problema — categorização e relatórios — mas esbarram sempre no mesmo obstáculo: **lançar a transação dá trabalho**. Abrir o app, escolher categoria, conta, cartão, confirmar — esse atrito é a principal causa de abandono desse tipo de produto. Além disso, a maioria trata "finanças" como algo estritamente individual, sem uma solução boa para famílias que querem visibilidade compartilhada ou para dividir contas entre amigos.

### A aposta do produto

1. **WhatsApp como canal primário de entrada de dados** — o brasileiro já vive dentro do WhatsApp; mandar uma mensagem é mais rápido que preencher um formulário.
2. **Finanças compartilhadas como cidadão de primeira classe**, não um adendo — workspaces (pessoal, família, e futuramente empresarial) com papéis granulares (dono, admin, membro, visualizador).
3. **Uma camada social entre usuários da própria plataforma** — transferir dinheiro entre contas de usuários diferentes e dividir despesas com amigos.
4. **IA usada com disciplina de custo** — um pipeline em camadas (regra determinística → modelo barato → modelo maior só quando necessário) mantém a categorização e a interpretação de linguagem natural baratas o bastante pra sustentar um plano gratuito de verdade.

## Diferenciais

- 🤖 **Chatbot financeiro no WhatsApp com IA**, interpretando linguagem natural variada (*"50 no mercado"*, *"paguei 120 de luz"*, *"recebi salário"*) sem exigir formato rígido.
- 📄 **Import de CSV de fatura/extrato bancário** com detecção automática de formato, deduplicação e reconhecimento de parcelamento.
- 💸 **Transferência entre usuários da plataforma**, com fluxo de aceite e "contato confiável" para automatizar as próximas vezes.
- 🤝 **Split de despesas** com confirmação em duas pontas — participantes podem ou não ter conta na plataforma.
- 🧮 **Calculadora de fórmulas personalizadas**, fixáveis na tela inicial (ex.: *"quanto sobra depois de tirar aluguel e cartão"*).
- 📱 **Widget de tela inicial (Android)** com o resumo financeiro do workspace ativo.
- 🌐 **Multiplataforma de verdade** — mobile, web e WhatsApp compartilham o mesmo backend e as mesmas regras de negócio.
- 🔒 **LGPD como parte do produto** — export de dados, exclusão de conta com cascade correto, anonimização em workspaces compartilhados.

Contexto de negócio completo (público-alvo, monetização, estado atual do produto): **[`negocio.md`](negocio.md)**.

## Arquitetura

Monorepo gerenciado com **[Turborepo](https://turbo.build/)** sobre workspaces do **[Bun](https://bun.sh/)**. Tudo que é reutilizável entre apps vive em `packages/`; os apps só compõem.

```
apps/
  backend/     # Bun + Elysia + Drizzle — API REST, Clean Architecture, webhooks do WhatsApp
  dashboard/   # SvelteKit — dashboard web (paridade real com o app) + área de superadmin
  landing/     # SvelteKit — site institucional (marketing, planos, termos/privacidade)
  mobile/      # Expo (React Native) — app iOS/Android, com widget de tela inicial
packages/
  db/          # Drizzle: schema, client, migrações (drizzle-kit) e seed
  email/       # Nodemailer + Resend (SMTP) + templates React Email
  formula/     # Parser/avaliador das fórmulas personalizadas (calculadora)
  queues/      # Abstração de filas + implementação BullMQ (Redis)
  shared/      # Tipos de domínio, enums, Either, catálogo de bancos — consumido por backend e mobile
  storage/     # Upload/leitura de arquivos (Cloudflare R2, S3-compatible)
```

| Camada | Stack |
|---|---|
| **Backend** | Bun + [Elysia](https://elysiajs.com/) + [Drizzle ORM](https://orm.drizzle.team/) sobre PostgreSQL, Zod em toda entrada, Clean Architecture (`domain` → `application` → `infra` → `http`), Redis + BullMQ para filas |
| **Dashboard & Landing** | [SvelteKit](https://svelte.dev/) (Svelte 5 / runes) + Tailwind CSS v4 + bits-ui, deploy no Cloudflare |
| **Mobile** | [Expo](https://expo.dev/) (React Native + TypeScript), NativeWind, React Hook Form + Zod, registry de componentes AniUI |
| **IA** | Gateway multi-provedor via [OpenRouter](https://openrouter.ai/) — pipeline em camadas (parser determinístico → classificador barato → agente com tool use só quando necessário) |
| **Pagamentos** | Stripe (Checkout + Customer Portal hospedados) |
| **E-mail** | Resend via SMTP, templates com React Email |
| **Observabilidade** | Logs estruturados com `x-request-id`, Microsoft Clarity no dashboard/landing |

Especificação técnica completa (modelos de dados, regras de negócio, decisões de arquitetura fechadas): **[`spec.md`](spec.md)**.

## Como rodar localmente

### Pré-requisitos

- [Bun](https://bun.sh/) `1.3.14+`
- [Docker](https://www.docker.com/) (Postgres + Redis locais via `docker-compose.yml`)

### Setup

```bash
# 1. Instala as dependências do monorepo inteiro
bun install

# 2. Sobe Postgres e Redis locais
docker compose up -d

# 3. Copia os .env.example de cada app/package que for rodar e preenche
cp apps/backend/.env.example apps/backend/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp apps/landing/.env.example apps/landing/.env
cp apps/mobile/.env.example apps/mobile/.env

# 4. Roda as migrações e popula o banco com dados de demonstração
bun run db:migrate
bun run db:seed

# 5. Sobe todos os apps em paralelo (Turborepo)
bun run dev
```

O `bun run dev` sobe o worker de filas junto do backend (`turbo dev worker`). Cada app expõe sua própria porta de dev server (backend em `:3000`, dashboard/landing via Vite — ver `PORT`/`API_URL` nos respectivos `.env.example`); o mobile abre via Expo (`bun --cwd=apps/mobile run start`).

### Scripts principais (raiz do monorepo)

| Comando | O que faz |
|---|---|
| `bun run dev` | Sobe todos os apps + worker em modo desenvolvimento (Turborepo) |
| `bun run build` | Build de produção de todos os apps |
| `bun run test` | Roda a suíte de testes (`bun:test`) de todos os pacotes |
| `bun run typecheck` | Typecheck de todo o monorepo |
| `bun run lint` / `lint:fix` | Lint com [Biome](https://biomejs.dev/) (repo inteiro) |
| `bun run db:generate` / `db:migrate` / `db:seed` / `db:studio` | Migrações e seed do Drizzle (`packages/db`) |
| `bun run worker` | Sobe só o processo worker (filas BullMQ) do backend |
| `bun run docs:api` | Gera a documentação da API a partir dos fragmentos em `docs/api/` |

## Testes e qualidade

- **Backend**: `bun test` (services com fakes, handlers via `app.handle(new Request(...))` do Elysia, repositórios contra um Postgres real).
- **Dashboard/Landing**: `svelte-check` (typecheck) + Prettier/ESLint por app, e Biome no repo inteiro.
- CI roda em todo push/PR (`.github/workflows/ci.yml`).

## Deploy e releases

Cada app de frontend/backend tem seu próprio ciclo de release, disparado por **tags git anotadas** (não pelo campo `version` do `package.json`, que é só cosmético/exibido na UI):

| App | Comando | Prefixo da tag | Workflow |
|---|---|---|---|
| Dashboard | `bun run release:dashboard [patch\|minor\|major]` | `dashboard-web-v*` | `deploy-dashboard.yml` |
| Landing | `bun run release:landing [patch\|minor\|major]` | `landingpage-v*` | `deploy-landing.yml` |
| Backend | `bun run release:api [patch\|minor\|major]` | `api-v*` | `deploy-backend.yml` |

O script (`scripts/release.ts`) lê a última tag local daquele prefixo, soma a versão e faz `git push` da tag nova — é isso que dispara o deploy em produção via GitHub Actions. Rode sempre a partir da `main`, com a working tree limpa, e com as tags locais sincronizadas (`git fetch --tags`) antes de gerar uma release.

## Roadmap

1. **M1** — Fundamentos: auth, workspaces (multi-tenancy), CRUD financeiro completo, faturas, previsão determinística básica.
2. **M2** — Compartilhamento (convites/papéis), chatbot WhatsApp com IA, filas (Redis + BullMQ), notificações push, export CSV.
3. **M3** — Camada social: transferências entre usuários, split de despesas, anexo de comprovante.
4. **M4** *(atual)* — Dashboard web, incluindo painel de superadmin.
5. **M5** — Workspaces corporativos (business), contas por setor.

## Documentação adicional

- **[`negocio.md`](negocio.md)** — contexto de negócio: problema, aposta do produto, público-alvo, monetização.
- **[`spec.md`](spec.md)** — especificação técnica completa: modelos de dados, regras de negócio, decisões de arquitetura.
- **[`docs/api/`](docs/api)** — documentação da API (gerada via `bun run docs:api`).
- Cada app (`apps/*`) tem seu próprio `PRODUCT.md`/`DESIGN.md` com o contexto de produto e design específico daquela superfície.

---

<div align="center">
  <sub>Produto em desenvolvimento — sem clientes reais ainda. Repositório privado.</sub>
</div>
