# M2-01 — Infraestrutura: Redis + BullMQ

**Status:** 🟢 Concluída (2026-07-16).

## Contexto

Fundação técnica do M2: várias outras tasks (whatsapp assíncrono, auto-lançamento
de recorrências, notificações push) dependem de uma fila real existir. O spec já
prevê isso desde o M1 (seção "Stack" e `packages/queues`): "Redis para cache e
BullMQ para filas — entram no M2 [...] No M1 não há job assíncrono real [...] o
schema e os services já nascem prontos para plugar os workers."

Hoje `packages/queues` só tem a interface (`QueueDispatcher`, `JobName`,
`JobPayloads`) e uma implementação `createDirectDispatcher` fire-and-forget
(dispara a função na hora, sem fila real — usada hoje só pra e-mail).

## Escopo

- Subir Redis no `docker-compose.yml` (dev/testes), ao lado do Postgres já existente.
- Implementar `createBullMqDispatcher` em `packages/queues` (mesma interface
  `QueueDispatcher`), plugado no lugar de `createDirectDispatcher` no
  `composition.ts` do backend — trocar a implementação por trás da interface,
  sem mudar quem chama `deps.dispatch(...)`.
- Processo worker separado (ou endpoint interno) que consome as filas.
- Migrar o `RateLimiter` (`apps/backend/src/infra/security/in-memory-rate-limiter.ts`)
  para uma implementação Redis com janela deslizante, atrás da mesma interface
  (`RateLimiter.isLimited`) — necessário porque M2 provavelmente já roda com
  mais de uma instância do backend (ou pelo menos deixa de ser instância única
  premissa do M1).
- Variáveis de ambiente novas (`REDIS_URL`) no schema Zod do backend + `.env.example`.

## Dependências

Nenhuma — é a primeira peça, bloqueia [[m2-06-whatsapp-webhook-chatbot]],
[[m2-09-auto-lancamento-recorrencias]] e [[m2-10-notificacoes-push]].

## Próximo passo

Escolher a lib cliente do BullMQ (`bullmq` npm), decidir se o worker roda no
mesmo processo do backend (dev) ou separado (prod) — recomendação: separado
desde já, mesmo em dev, pra não mascarar bugs de concorrência/retry.

## Implementação (2026-07-16)

- `docker-compose.yml`: serviço `redis` (`redis:8-alpine`, porta 6379, volume
  `redisdata`, healthcheck `redis-cli ping`).
- `packages/queues/src/bullmq.ts` (novo): `createBullMqDispatcher` (produtor —
  uma fila única `finance-jobs`, cada entrada `{name, payload}`; nunca rejeita
  pra fora — falha ao enfileirar só loga via `onError`, preservando o mesmo
  contrato do `createDirectDispatcher` do M1, essencial porque `dispatch` é
  chamado no meio de fluxos como registro/reset sem try/catch) e
  `createBullMqWorker` (consumidor — processo separado, `attempts: 3` com
  backoff exponencial).
- `apps/backend/src/main/job-handlers.ts` (novo): mapa de handlers extraído do
  composition root, compartilhado entre o dispatcher (só enfileira) e o novo
  `apps/backend/src/main/worker.ts` (entrypoint do processo worker, comando
  `bun run worker` — script novo em `apps/backend/package.json` e no root).
- `apps/backend/src/main/composition.ts`: troca `createDirectDispatcher` por
  `createBullMqDispatcher(env.REDIS_URL, ...)`.
- **RateLimiter migrado pra Redis** (`apps/backend/src/infra/security/redis-rate-limiter.ts`,
  novo): janela deslizante via sorted set (`ZREMRANGEBYSCORE` + `ZADD` +
  `ZCARD` + `PEXPIRE` num `multi()` atômico). Isso obrigou a mudar a interface
  `RateLimiter.isLimited` de síncrona pra `Promise<boolean>` (Redis é
  inerentemente assíncrono) — os 5 call sites existentes (`http/guards.ts`,
  `http/modules/auth/routes/index.ts`, `forgot-password.ts`,
  `verify-reset-code.ts`, `reset-password.ts`) ganharam `await`.
  `createInMemoryRateLimiter` continua existindo só para os testes
  (`test/deps.ts`), que não dependem de Redis rodando.
- `REDIS_URL` no schema Zod do backend (`main/env.ts`) e no `.env.example`.
- Dependências novas: `ioredis` (backend, pro rate limiter) e `bullmq` +
  `ioredis` (`packages/queues`).

**Validação:** `bun test` (backend) 26/26 continua passando (usa os deps de
teste em memória, não depende de Redis). Testado ao vivo numa instância
isolada (`PORT=3001`, sem mexer no `bun run dev` do usuário): 11 tentativas
de login com credenciais falsas → a 11ª retornou 429 (rate limit Redis real
funcionando); registro de um usuário de teste disparou o job
`email.verify-email` de verdade, confirmado no stream de eventos do BullMQ
(`added → waiting → active → completed`) via `redis-cli xrange
bull:finance-jobs:events`.

**Pendência:** nenhuma do escopo original.

## Ajuste (2026-07-16): um único worker, `bun run dev` já sobe os dois

- **Decisão registrada no `spec.md`** (Stack > Backend + `packages/queues`):
  podem existir várias filas BullMQ por domínio no futuro (WhatsApp,
  notificações, etc.), mas **um único processo worker** consome todas —
  nunca um processo por fila. Comentado em `packages/queues/src/bullmq.ts`
  também, pra quem for adicionar a próxima fila não criar um segundo
  entrypoint por engano.
- `turbo.json`: task `worker` adicionada (mesmo formato de `dev`: `cache:
  false, persistent: true`).
- Root `package.json`: `dev` agora é `turbo dev worker --filter='./apps/*'`
  — `bun run dev` sobe o servidor HTTP **e** o worker juntos. Confirmado via
  `turbo ... --dry-run=json` que o `mobile` (sem script `worker`, nem `dev`
  — roda via `expo start` à parte) é ignorado sem erro (`<NONEXISTENT>`).
