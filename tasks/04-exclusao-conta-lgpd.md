# 04 — Exclusão de conta (LGPD)

**Status:** 🟢 Concluída (2026-07-15)

## Contexto

A spec cita "Configurações" como parte do M1: verificação de e-mail (✅ feita nesta
mesma leva) + exclusão de conta com cascade (LGPD). Conferido em 2026-07-15: não existe
nenhuma rota `DELETE /users/me` (ou equivalente) no backend, nem use case, nem tela.

## Escopo

### Backend
- Nova rota `DELETE /auth/me` (ou `/users/me`, seguir o padrão de prefixo já usado):
  exige reautenticação (senha atual no body, não só o access token — ação sensível
  demais pra confiar só no token) e faz cascade real: workspace pessoal e tudo que
  pertence a ele (bancos, contas, cartões, categorias, transações, faturas,
  recorrências, audit log), revogação de todos os refresh tokens, e-mail de
  confirmação da exclusão. Se o `onDelete: "cascade"` já estiver configurado nas FKs
  do schema (`packages/db/src/schema/*.ts`, conferir), a exclusão do workspace já
  arrasta o resto sozinha — validar antes de escrever lógica de cascade manual.
- Erro se a senha não bater (não pode revelar mais que "senha incorreta").

### Mobile
- Tela de Configurações (ou dentro de `/profile`, que já existe desta leva) com uma
  seção separada, visualmente destacada como perigosa: campo de senha + confirmação
  forte (ex.: digitar "excluir" ou o e-mail da conta) antes de habilitar o botão.
  Depois de excluir, limpar tokens locais e redirecionar pro login (mesmo padrão do
  logout).

## Implementação (2026-07-15)

**Backend:**
- `DELETE /auth/me`: `requireAuthenticated` + body `{ password }` (`deleteAccountSchema` em
  `schemas.ts`). Reautentica via `hasher.verify`; senha errada reusa `invalid_credentials`
  (nenhum código novo em `AUTH_ERRORS`).
- Use case `apps/backend/src/application/use-cases/auth/delete-account.ts`: dentro de
  `uow.run`, deleta o usuário e depois o workspace pessoal (`user.defaultWorkspaceId`).
  Ordem importa: `users.default_workspace_id → workspaces.id` não tem cascade, então
  deletar o workspace primeiro quebraria a FK enquanto o usuário ainda existe.
- **Nenhuma lógica de cascade manual**: confirmado no schema que `bank_accounts`, `cards`,
  `categories`, `transactions`, `card_invoices`, `recurring_transactions`, `audit_logs`,
  `banks`, `workspace_members`, `workspace_invites` e `refresh_tokens` já têm
  `onDelete: "cascade"` na FK de `workspace_id`/`user_id` — deletar user + workspace já
  arrasta tudo.
- Adicionado `delete()` em `UserRepository` e `WorkspaceRepository` (portas + infra),
  reaproveitando `deleteAllRefreshByUser` não foi necessário (cascade cobre).
- Teste em `auth.test.ts`: senha errada falha e usuário permanece; senha certa apaga
  usuário e workspace (`db.query.users`/`db.query.workspaces` retornam `undefined`).
  Suite: 26/26 passando (era 25).
- **Não implementado**: e-mail de confirmação de exclusão (citado no escopo original,
  mas fora do que a leva pediu explicitamente — nenhum `deps.dispatch("email...")`
  foi adicionado). Avaliar se entra numa próxima leva.
- **Risco conhecido, não tratado**: `workspace_invites.invited_by → users.id` não tem
  `onDelete`. Se o usuário convidou alguém para OUTRO workspace (não o pessoal), a
  exclusão falha por violação de FK. Não ocorre no fluxo comum (M1 não expõe convites
  cruzados amplamente), mas vale endereçar (ex.: `onDelete: "set null"`, mesmo padrão já
  usado em `audit_logs.user_id` e `transactions.created_by`) antes de liberar convites
  entre workspaces multi-membro em produção.

**Mobile:**
- `apps/mobile/src/lib/auth-api.ts`: `deleteAccount(password)` → `DELETE /auth/me`.
- `apps/mobile/src/app/(app)/profile.tsx`: seção "Zona de perigo" (`Card` com
  `border-destructive`), campo de senha (`PasswordInput` com `useState`, sem RHF — caso
  simples de campo único), botão destrutivo desabilitado até ter senha digitada, e
  `Alert.alert` de confirmação adicional antes de chamar a API. Sucesso chama
  `signOut()` (limpa tokens; a tentativa de `POST /auth/logout` com refresh token já
  inexistente falha silenciosamente, comportamento já existente em `signOut`) — o
  redirect pro login é automático via `(app)/_layout.tsx`.
- Validado com `bunx tsc --noEmit` (limpo nos arquivos tocados; os 6 erros restantes de
  typed-routes em `accounts.tsx`/`cards/index.tsx`/`categories/index.tsx` são
  pré-existentes, não relacionados a esta mudança) e `expo export -p web` (build ok,
  `/profile` incluído nas rotas estáticas geradas).
