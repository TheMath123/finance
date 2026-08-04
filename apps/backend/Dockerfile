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
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/email/package.json packages/email/package.json
COPY packages/formula/package.json packages/formula/package.json
COPY packages/queues/package.json packages/queues/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/storage/package.json packages/storage/package.json
RUN bun install --frozen-lockfile --production

# Camada final: node_modules já resolvido + código-fonte completo. O comando
# real (web vs worker) é definido pelos `[processes]` do fly.toml, não aqui.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend apps/backend
COPY packages packages
EXPOSE 3000
CMD ["bun", "run", "apps/backend/src/main/index.ts"]
