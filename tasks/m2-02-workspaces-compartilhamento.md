# M2-02 — Workspaces compartilhados: convites, papéis, seletor

**Status:** 🔵 Backlog — não iniciada.

## Contexto

O schema já nasceu pronto pra isso desde o M1 (`Workspace`, `WorkspaceMember`,
`WorkspaceInvite` já existem em `packages/db/src/schema/`), mas o M1 não expõe
nenhuma rota de convite/gestão de membros nem UI de troca de workspace — todo
usuário só enxerga o workspace `personal` dele. Este é o núcleo do M2 (seção
"Workspaces e compartilhamento" do spec).

## Escopo

### Backend
- `POST /workspaces` (criar workspace `family`, respeitando o limite do plano —
  ver [[m2-03-enforcement-plano]]).
- Convites: `POST /workspaces/:id/invites` (owner/admin convida por e-mail ou
  telefone), `POST /invites/:id/accept`, `POST /invites/:id/revoke`; se o
  convidado ainda não tem conta, resolver o convite pendente no primeiro
  cadastro com aquele e-mail/telefone (`register.ts` precisa checar convites
  pendentes pro e-mail informado).
- Papéis: `PATCH /workspaces/:id/members/:userId` (mudar role), `DELETE
  .../members/:userId` (remover membro) — validar a regra de sucessão (único
  owner não pode sair nem ser rebaixado; precisa promover outro membro antes).
- Autorização por papel em **todas** as rotas de domínio existentes (banks,
  accounts, cards, categories, transactions, invoices, recurring) — hoje elas
  só checam membership via `requireWorkspaceRole` guard; confirmar que o guard
  já diferencia owner/admin/member/viewer nas ações certas (viewer só leitura).
- `GET /workspaces` (listar workspaces do usuário, pro seletor).

### Mobile
- Seletor de workspace (dropdown/modal no topo do app, troca `workspaceId`
  ativo e invalida as queries do TanStack Query).
- Tela de membros do workspace (listar, mudar papel, remover).
- Tela/fluxo de convite (enviar convite por e-mail/telefone; tela de convites
  pendentes recebidos, aceitar/recusar).
- Onboarding de criação de workspace `family` (nome + convite inicial opcional).

## Dependências

Nenhuma técnica, mas define o "workspaceId ativo" que várias telas hoje
assumem fixo (`useSession().workspaceId`) — vale revisar todo lugar que hoje
lê `workspaceId` do contexto pra confirmar que reage à troca de workspace.

## Próximo passo

Desenhar as rotas de convite/membros primeiro (backend), depois o seletor no
app — sem seletor funcionando, não dá pra testar o resto na prática.
