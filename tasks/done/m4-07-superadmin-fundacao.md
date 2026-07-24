# M4-07 — Superadmin: fundação (guard + layout administrativo)

**Status:** 🟢 Concluída (2026-07-24, validada ponta a ponta via script contra
o backend e o dashboard reais — ver "Implementação")

## Contexto

`spec.md`, "Papéis de plataforma": todo usuário tem `platformRole`
(`"user"` default | `"superadmin"`), **já existe no schema** desde o M1
(`packages/db/src/schema/user.ts`, `platformRoleEnum`) mas sem nenhum uso
real ainda — nenhuma rota checa esse campo hoje. Esta task fecha a
fundação (autorização) antes das telas de superadmin (M4-08/09) existirem.
Regra crítica do LGPD (spec): superadmin administra a **plataforma**, mas
**não tem acesso aos dados financeiros dos usuários** — rotas de domínio
continuam exigindo membership de workspace, sem bypass nenhum.

## Escopo

### Backend
- Novo módulo `apps/backend/src/http/modules/admin/` — plugin/guard
  Elysia que rejeita (403) qualquer rota do módulo se
  `user.platformRole !== "superadmin"` (equivalente ao `requireRole` que o
  módulo `workspace` já usa pra papéis de workspace, mas checando
  `platformRole` em vez de membership).
- **Auditoria própria**: ações administrativas (suspender usuário, mudar
  categoria padrão, mudar orçamento de IA, mudar feature flag) devem ser
  logadas separado do `AuditLog` de workspace (spec: "Ações administrativas
  são registradas em auditoria própria") — nova tabela
  `admin_audit_log`/schema em `packages/db/src/schema/`.
- `platformRole` não é atribuível via cadastro (spec: "atribuído por
  seed/manual no banco") — confirmar que `register.ts` força sempre
  `"user"` (já deve ser o default do schema, mas vale um teste explícito
  pra travar a regra) e documentar no `packages/db/src/seed.ts` como
  promover um usuário a superadmin manualmente (update direto, sem rota
  HTTP de "virar superadmin" — nunca expor esse poder via API).

### Dashboard
- `routes/(admin)/+layout.server.ts` — redireciona pra fora (404, não
  403 — não revelar que a área existe) se `platformRole !== "superadmin"`.
- `routes/(admin)/+layout.svelte` — casca visual separada da área normal
  (nav própria: usuários, categorias, IA, feature flags, métricas — cada
  uma vira M4-08/M4-09).

## Dependências

M4-01 (auth). Bloqueante de M4-08 e M4-09.

## Critério de conclusão

Usuário comum recebe 404 na área `/admin`; usuário promovido a superadmin
manualmente no banco acessa e vê o shell vazio; ação de teste gera entrada
no `admin_audit_log`.

## Implementação (2026-07-24)

Um desvio de nomenclatura, sem mudança de intenção: a rota do dashboard é
`routes/admin/` (pasta real, sem parênteses) em vez de `routes/(admin)/`
como o escopo original sugeria — no SvelteKit, `(nome)` é um *route group*
que **não** vira segmento de URL (é assim que `(app)` hoje cobre `/`,
`/transactions` etc. sem virar `/app/transactions`). Como o critério de
conclusão pede literalmente a URL `/admin`, o grupo teria que se chamar
`admin` sem parênteses mesmo.

O que existe:
- **Backend**: `admin_audit_logs` (`packages/db/src/schema/admin-audit-log.ts`,
  migration `0017_square_loners.sql`) — `action`/`entity` como texto livre
  (não enum) porque o conjunto de ações cresce a cada milestone de
  superadmin (M4-08 adiciona "suspender usuário", M4-09 adiciona "mudar
  orçamento de IA"/"mudar feature flag") e um enum pediria migration nova
  a cada uma. Port `AdminAuditRecorder` (só `record()` — sem `list()`,
  YAGNI: nenhuma tela de leitura existe ainda) + repo, ligados em
  `Repositories.adminAudit`.
- **Guard**: `requireSuperadmin` em `http/guards.ts` — autentica, aplica o
  mesmo rate limit por usuário que `requireWorkspaceRole` já usa (chave
  `admin:${userId}`, defesa em profundidade específica pra essa área
  sensível) e checa `platformRole === "superadmin"` via
  `repos.user.findById`; 403 (não 404 — a distinção 404-vs-403 é só do lado
  do dashboard, que não quer revelar a existência da área; a API pode
  responder 403 normalmente). `requireAuthenticated` teve o tipo do
  parâmetro estreitado de `AppDeps` pra `Pick<AppDeps, 'tokens'>` — só o
  que a função realmente usa — o que também deixou `requireSuperadmin`
  testável sem precisar forjar um `AppDeps` completo (com logger `pino`
  real etc.) nos testes.
- **`platformRole` nunca setável via API**: confirmado que `CreateUserData`
  (`application/ports/user-repository.ts`) não tem esse campo — `register.ts`
  estruturalmente não tem como setar outra coisa que não o default do
  schema (`"user"`). Travado por teste (`auth.test.ts`) além da inspeção
  estrutural. Promoção documentada como comentário em `packages/db/src/seed.ts`
  (`UPDATE users SET platform_role = 'superadmin' WHERE email = ...`) — sem
  rota HTTP nenhuma pra isso, de propósito.
- **`/auth/me` e sessão passam a expor `platformRole`** (`session.ts`,
  `me.ts`) — é como o dashboard decide se mostra a área `/admin`, sem
  precisar de um endpoint novo só pra essa checagem.
- **Dashboard**: `routes/admin/+layout.server.ts` (guard 404) +
  `routes/admin/+layout.svelte` (casca com sidebar própria, sem reusar o
  sidebar do app — nav de Usuários/Categorias/IA/Feature flags/Métricas
  fica comentada como texto, sem link, até M4-08/M4-09 criarem as rotas de
  verdade) + `routes/admin/+page.svelte` (placeholder).
- **Testes**: `http/guards.test.ts` (novo) — `requireSuperadmin` rejeita
  usuário comum (403) e libera + grava em `admin_audit_logs` depois da
  promoção manual no banco, contra o Postgres real (mesmo padrão de
  `auth.test.ts`). `auth.test.ts` ganhou um teste que trava `platformRole
  === "user"` no registro.
- **Validação end-to-end real** (não só testes automatizados): registrei um
  usuário via `/auth/register` do backend rodando, promovi a superadmin
  direto no banco (`UPDATE`), logei de novo, e bati no `/admin` do dashboard
  rodando com os cookies reais (`_ta`/`_rr`) — 200 com o shell
  ("Painel administrativo") pro superadmin, 404 pra um usuário comum recém
  registrado. Cobre o critério de conclusão de ponta a ponta, indo além do
  que M4-05/M4-06 tiveram (aqueles ficaram só com lint/typecheck/build +
  boot do dev server, sem exercitar o fluxo de auth de verdade).

Verificado: `bun run lint` (Biome, todo o monorepo), `svelte-check` do
dashboard, `tsc --noEmit` do backend e do `@finance/db`, suíte completa do
backend (177 testes, incluindo os novos), build de produção do dashboard,
e o fluxo E2E manual descrito acima.
