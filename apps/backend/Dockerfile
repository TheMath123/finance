# Contexto de build: RAIZ do monorepo (não apps/backend/) — precisa enxergar
# os packages/* que o backend depende via workspace. Ver fly.toml em
# apps/backend/ (build.dockerfile aponta pra cá) e o workflow
# .github/workflows/deploy-backend.yml, que roda `flyctl deploy` a partir da
# raiz do repo.
FROM oven/bun:1 AS base
WORKDIR /app

# Camada de deps: só os manifests de cada workspace usado pelo backend, pra
# cachear `bun install` enquanto só código muda (sem tocar em package.json).
FROM base AS deps
COPY package.json bun.lock bunfig.toml ./
COPY apps/backend/package.json apps/backend/package.json
# dashboard/mobile não são usados em runtime pelo backend, mas o bun.lock é
# único pro monorepo inteiro (workspaces "apps/*") — sem os manifests deles
# aqui, `bun install --frozen-lockfile` acha que o lockfile mudou (membros
# de workspace "sumiram") e recusa instalar.
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/landing/package.json apps/landing/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/email/package.json packages/email/package.json
COPY packages/formula/package.json packages/formula/package.json
COPY packages/queues/package.json packages/queues/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/storage/package.json packages/storage/package.json
# --linker=hoisted: o Bun 1.3 usa por padrão o linker "isolated" (estilo
# pnpm), que cria um node_modules PRÓPRIO dentro de cada workspace member
# (apps/backend/node_modules, packages/*/node_modules) com symlinks pro
# store — em vez de hoisted só na raiz. O estágio `runtime` abaixo faz COPY
# do código-fonte de apps/backend e packages a partir do contexto de build
# (sem node_modules), o que sobrescreveria essas pastas isoladas e quebraria
# os imports em runtime (ex: "Cannot find module '@elysiajs/cors'"). Forçar
# o linker clássico resolve tudo num único node_modules na raiz, que é o que
# o runtime já copia.
RUN bun install --frozen-lockfile --production --linker=hoisted

# Camada final: node_modules já resolvido + código-fonte completo. O comando
# real (web vs worker) é definido pelos `[processes]` do fly.toml, não aqui.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend apps/backend
COPY packages packages
EXPOSE 3000
CMD ["bun", "run", "apps/backend/src/main/index.ts"]
