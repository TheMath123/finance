# M4-02 — Layout base + workspaces (seletor, membros, convites)

**Status:** 🟡 Em andamento — código completo (lint, typecheck e build de
produção limpos); falta a validação manual do usuário no browser.

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

## Implementação (2026-07-24)

- **Decisão de UX do usuário (mid-implementação)**: em vez de um item de
  sidebar por tela, tudo de workspace vive numa única aba **Workspace** com
  navegação interna por abas-pílula (Membros | Convites | Meus convites |
  Atividade | Configurações) — sidebar ficou só Início + Workspace.
  `routes/(app)/workspace/+layout.svelte` é o hub das abas; `/workspace`
  redireciona pra `/workspace/members`. "Meus convites" mudou de `/invites`
  pra `/workspace/my-invites`.
- **Linguagem visual**: Figma MCP continuou rate-limited (plano Starter) —
  aplicada a linguagem já mapeada do arquivo na fase mobile: flat sem
  sombra, pills translúcidas `bg-primary/10` (aba ativa `bg-primary`),
  linhas com divisor `border-t border-foreground/10` em vez de cards,
  radius 8px, Phosphor (`phosphor-svelte`). Se houver frames desktop no
  Figma, revalidar com screenshots quando o limite resetar.
- `lib/server/workspace-api.ts` — client server-only com todos os contratos
  espelhados (WorkspaceSummary, WorkspaceMemberView, WorkspaceInviteView,
  MyInviteView, AuditLogView) e as 12 rotas do módulo workspace.
- `lib/server/active-workspace.ts` — workspace ativo em cookie `_ws`
  (httpOnly, mesmo padrão `_ta`/`_rr` da sessão); action `?/switch` valida
  que o workspace pertence ao usuário antes de gravar.
- Layout: `lib/components/layout/{sidebar,topbar,workspace-switcher}.svelte`;
  o switcher é um `<select>` estilizado como pílula que submete no change
  (funciona sem JS via botão implícito do form).
- Todas as mutações são `actions` server-side com formulários nativos +
  `use:enhance` — nenhum fetch no client, conforme a regra do spec.
- Gate de UI por papel: owner/admin veem troca de papel/remoção/convite/
  renomear; viewer/member só leitura (backend segue sendo a autoridade).
- Selects nativos estilizados (não o Select da registry) — dropdown de
  papel precisa submeter valor em form nativo, o que os componentes
  JS-driven do Bits UI não fazem sem input escondido; YAGNI por ora.
- **Criar workspace** (retrabalhado após feedback do usuário — "ficou
  confuso" dentro das configurações): virou a **última opção do próprio
  select de workspace** ("+ Novo workspace"), que navega pra página
  dedicada `/workspace/new` (`+page@(app).svelte` escapa do layout de
  abas). A aba Configurações ficou só com o que diz respeito ao workspace
  ativo (renomear).
- **Responsividade** (nova regra do spec, 2026-07-24: o dashboard também é
  a alternativa pra quem não usa o app): baseline aplicada — sidebar vira
  trilho só de ícones abaixo de `sm`, topbar esconde o nome do usuário e
  aperta espaçamentos. Polimento mobile por tela continua sendo requisito
  das próximas tasks.

Verificado: `bun run lint` (Biome raiz + Prettier/ESLint do dashboard),
`svelte-check` e `vite build` de produção limpos.

## Critério de conclusão

Trocar de workspace, convidar/aceitar convite e gerenciar membros
funcionando ponta a ponta contra o backend real, com gate de UI correto
por papel (viewer não vê botão de convidar, etc.).
