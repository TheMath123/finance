# M4-07 — Superadmin: fundação (guard + layout administrativo)

**Status:** 🔵 Backlog (não iniciada)

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
