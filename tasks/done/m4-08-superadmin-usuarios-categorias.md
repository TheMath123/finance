# M4-08 — Superadmin: gestão de usuários + categorias padrão do seed

**Status:** 🟢 Concluída (2026-07-25, validada ponta a ponta)

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

## Implementação (2026-07-25)

Decisão confirmada com o usuário: categorias padrão viraram tabela
(`default_categories`), não ficaram só documentadas em código.

- **Schema**: `users.suspended_at` (timestamp nullable) +
  `default_categories` (id/name/icon/color/isFallback/timestamps),
  migration `0018_needy_the_spike.sql` — inclui `INSERT` de bootstrap com
  os 9 valores que antes viviam em `default-categories.ts`, pra não perder
  o seed de produção na migração. `register.ts` e `create-workspace.ts`
  passaram a ler `repos.defaultCategory.list()` em vez de importar a
  constante estática; `packages/db/src/default-categories.ts` continua
  existindo só como dado usado pelo `seed.ts` (script de dev).
- **Invariante de fallback**: no máximo uma `default_category` com
  `isFallback: true` — criar/editar uma nova como fallback desmarca a
  anterior (mesma lógica das transações reais, aplicada ao nível de
  template). Excluir a categoria fallback é bloqueado
  (`cannot_delete_fallback_category`) — precisa promover outra primeiro.
- **Suspensão**: `login.ts` rejeita com o novo erro `account_suspended`
  (403, mensagem explícita) quando a senha está certa mas a conta está
  suspensa; senha errada numa conta suspensa continua caindo no
  `invalid_credentials` genérico (não vaza o estado da conta pra quem não
  provou saber a senha). Guard extra: superadmin não pode suspender a
  própria conta (`cannot_suspend_self`).
- **Atomicidade**: `suspend/reactivate-user` e as 3 mutações de
  `default-category` rodam dentro de `deps.uow.run(...)` (mesma transação
  do registro em `admin_audit_logs`) — descoberto na prática que sem isso
  uma falha na auditoria (ex.: FK inválida) deixava a mutação principal já
  committada, órfã.
- **`AdminUserView`**: mapeamento explícito sem `passwordHash`, mesmo
  padrão de `me.ts` — nunca retorna a entidade `User` crua pela API.
- **Rotas**: novo módulo `http/modules/admin/routes/` (`GET /admin/users`
  com busca+paginação, suspend/reactivate, CRUD de
  `/admin/default-categories`), todas atrás de `requireSuperadmin`,
  registrado em `main/app.ts`.
- **Dashboard**: `admin-api.ts` + `routes/admin/users` (busca, paginação,
  suspender/reativar via form actions) + `routes/admin/default-categories`
  (CRUD via dialog, mesmo padrão de `more/banks`) + nav do layout admin
  atualizada com os dois itens.
- **Teste evitado de propósito**: a troca de fallback (criar/editar com
  `isFallback: true` desmarca a anterior) não tem teste automatizado —
  `default_categories` é global e compartilhada por toda a suíte sem
  isolamento por transação; um teste que troca a fallback fica visível
  pra outros arquivos rodando em paralelo (reproduzido: um teste do
  WhatsApp que esperava "outros" na resposta pegou a fallback temporária
  no meio da troca). Validado manualmente via smoke test em vez disso.
- **Validação end-to-end real**: promovi um usuário a superadmin, loguei
  na dashboard, suspendi um usuário de teste real via
  `/admin/users?/suspend` e confirmei 403 `account_suspended` no login
  dele; reativei e confirmei login OK de novo; editei "Mercado" →
  "Mercado e Feira" em `/admin/default-categories`, registrei um usuário
  novo e confirmei que o workspace dele nasceu com "Mercado e Feira" em
  vez de "Mercado" — critério de conclusão batido literalmente.

Verificado: `bun run lint` (Biome, monorepo), `svelte-check` do dashboard,
`tsc --noEmit` do backend, suíte completa do backend (182 testes, 6 novos),
build de produção do dashboard, e o fluxo E2E manual acima.
