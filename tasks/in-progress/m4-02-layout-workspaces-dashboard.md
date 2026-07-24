# M4-02 — Layout base + workspaces (seletor, membros, convites)

**Status:** 🔵 Backlog (não iniciada)

## Contexto

Depois do login (M4-01), a casca do dashboard: navegação e a mecânica de
workspace, que toda tela seguinte depende (todo dado financeiro pertence a
um workspace — `spec.md`, "Workspaces e compartilhamento"). Backend já tem
tudo pronto (`apps/backend/src/http/modules/workspace/`) — esta task é
**só frontend**, consumindo rotas existentes.

## Escopo

### Dashboard — `apps/dashboard/src/`
- `routes/(app)/+layout.svelte` — casca visual (sidebar de navegação +
  topbar), um componente por arquivo: `lib/components/layout/sidebar.svelte`,
  `lib/components/layout/topbar.svelte`, `lib/components/layout/workspace-switcher.svelte`.
- `lib/components/layout/workspace-switcher.svelte` — consome
  `GET /workspaces/mine` (`list-my-workspaces.ts`), troca de workspace ativo
  (guardar em cookie/sessão, igual o app faz com `AsyncStorage` hoje).
- `routes/(app)/workspace/members/+page.svelte` — lista membros
  (`list-members.ts`), troca de papel (`update-member-role.ts`), remoção
  (`remove-member.ts`) — gate de UI por papel (`owner`/`admin` só).
- `routes/(app)/workspace/invites/+page.svelte` — convidar por e-mail/telefone
  (`create-invite.ts`), listar convites do workspace (`list-workspace-invites.ts`),
  revogar (`revoke-invite.ts`).
- `routes/(app)/invites/+page.svelte` — convites pendentes **do usuário**
  (`list-my-invites.ts`), aceitar (`accept-invite.ts`).
- `routes/(app)/workspace/settings/+page.svelte` — criar workspace
  (`create-workspace.ts`), editar (`update-workspace.ts`).
- `routes/(app)/workspace/activity/+page.svelte` — feed de atividade
  (`list-activity.ts`, leitura do `AuditLog` — já existe desde o M2-04).

## Dependências

M4-01 (scaffold + auth).

## Decisões em aberto

- Onboarding guiado (seed de categorias + criação da primeira conta/cartão
  ao criar workspace) já existe no backend desde o M1/M2 — decidir se o
  dashboard replica o fluxo guiado do app ou só cria o workspace e deixa o
  usuário navegar livre (o app mobile decidiu manter comportamento
  silencioso, ver [[03-onboarding-guiado]] em backlog — provavelmente vale
  a mesma decisão aqui por consistência).

## Critério de conclusão

Trocar de workspace, convidar/aceitar convite e gerenciar membros
funcionando ponta a ponta contra o backend real, com gate de UI correto
por papel (viewer não vê botão de convidar, etc.).
