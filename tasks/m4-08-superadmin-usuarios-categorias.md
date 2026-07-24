# M4-08 — Superadmin: gestão de usuários + categorias padrão do seed

**Status:** 🔵 Backlog (não iniciada)

## Contexto

Continuação do M4-07. Duas frentes do spec ("configurações globais":
"gestão de usuários (suspender/reativar)" e "categorias padrão do seed").

## Escopo

### Backend
- **Gap de schema**: `User` não tem campo de suspensão hoje
  (`apps/backend/src/domain/entities/user.ts` — só tem
  `failedLoginAttempts`/`lockedUntil`, que é o lockout de tentativas de
  senha, semântica diferente). Precisa de `suspendedAt: Date | null` (ou
  enum `status: "active" | "suspended"`) + migration. Login (`login.ts`)
  passa a rejeitar usuário suspenso.
- `application/use-cases/admin/suspend-user.ts`,
  `reactivate-user.ts`, `list-users.ts` (paginado, busca por nome/e-mail).
- Rotas em `http/modules/admin/routes/` — `GET /admin/users`,
  `POST /admin/users/:id/suspend`, `POST /admin/users/:id/reactivate`.
- **Categorias padrão do seed**: hoje vivem hardcoded em
  `packages/db/src/default-categories.ts` (usado por `register.ts` ao
  criar o workspace pessoal). Decisão de arquitetura necessária aqui —
  ver "Decisões em aberto".

### Dashboard
- `routes/(admin)/users/+page.svelte` — lista, busca, suspender/reativar.
- `routes/(admin)/default-categories/+page.svelte` — CRUD das categorias
  padrão (nome/ícone/cor).

## Dependências

M4-07 (guard + auditoria administrativa).

## Decisões em aberto

- **Categorias padrão viram tabela editável em runtime, ou continuam
  hardcoded em código** (`default-categories.ts`) **com o painel só
  exibindo/documentando**? Editar em runtime é o que o spec pede
  ("configurações globais... categorias padrão do seed" como algo
  administrável), mas exige migrar de constante pra tabela
  (`default_categories` no banco) + `seed.ts` passa a ler de lá. Recomenda-se
  migrar pra tabela — é o único jeito de "gestão" fazer sentido sem
  redeploy a cada mudança.

## Critério de conclusão

Suspender um usuário de teste e confirmar que o login dele passa a falhar;
editar uma categoria padrão e confirmar que o próximo workspace criado já
nasce com ela.
