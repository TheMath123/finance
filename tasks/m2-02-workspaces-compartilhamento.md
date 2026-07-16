# M2-02 — Workspaces compartilhados: convites, papéis, seletor

**Status:** 🟢 Concluída (2026-07-16).

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

## Implementação (2026-07-16)

**Backend** — módulo `workspace` completo:
- `POST /workspaces` (cria `family`, criador vira owner), `GET /workspaces`
  (já existia), `GET/PATCH/DELETE .../members[/:userId]` (mudar papel,
  remover/sair), `POST .../invites` + `GET .../invites` (enviados),
  `GET /invites` (recebidos, casa por e-mail **e** telefone do usuário — já
  preparado pro dia em que M2-05 popular `users.phone`), `POST
  /invites/:id/accept`/`revoke`.
- Regra de sucessão implementada em `update-member-role.ts`/`remove-member.ts`:
  só owner promove a owner; rebaixar/remover um owner exige que sobre outro
  (`countOwners`); "sair" e "remover alguém" são o mesmo endpoint
  (`DELETE .../members/:userId`), autorização (auto vs. admin/owner) checada
  dentro do use case, não no guard HTTP.
- E-mail de convite **sem link** (mesmo motivo do reset de senha: esquema
  customizado é removido por clientes de e-mail) — `email.workspace-invite`
  perdeu o campo `acceptUrl`; aceite é sempre pela tela "Convites" do app,
  autenticado. `buttonStyle` (não usado por mais nenhum template) removido.
- Convite por telefone é aceito no schema mas não resolve usuário ainda (sem
  `findByPhone`/vínculo WhatsApp até M2-05) — documentado inline, não é bug.
- **Gap real encontrado e corrigido**: `delete-account.ts` só cobria o
  workspace pessoal (correto no M1, onde era o único caso de "único owner").
  Generalizado pra checar `countOwners` em **todos** os workspaces que o
  usuário possuía antes de excluir — workspace some por completo só se ele
  era o único owner; se havia outro, a membership dele some e o workspace
  continua (via cascade), exatamente como o spec de LGPD manda.
- **Bug real encontrado e corrigido**: `workspace_invites.invited_by` não
  tinha `onDelete` — um owner/admin que enviou convite e depois excluísse a
  conta quebraria com violação de FK. Virou nullable + `onDelete: "set null"`
  (migração `0006_odd_james_howlett.sql`), mesmo padrão de
  `transactions.created_by`/`audit_logs.user_id`. Isso fecha de vez o risco
  que a task 04 (arquivada) tinha deixado documentado, mas não corrigido.
- Confirmado que as rotas de domínio existentes (bank/account/card/category/
  transaction/recurring) já diferenciam viewer (só leitura) / member (CRUD de
  transação) / admin (CRUD de cadastro) corretamente — nada a mudar ali.
- Testes: `workspace.test.ts` novo (12 casos: criação, convite feliz/duplicado/
  alheio/revogado, sucessão de owner nas 4 variações, e os 3 cenários de LGPD
  com workspace compartilhado). Suite completa: **38/38 passando**. Validado
  também ao vivo via curl numa instância isolada (registro de 2 usuários →
  criar workspace → convidar → listar convite recebido → aceitar → ver
  membership) — tudo funcionando ponta-a-ponta.

**Mobile**:
- `lib/workspace-api.ts` + `lib/schemas/workspace.ts`.
- `SessionProvider` ganhou `switchWorkspace()` (persistido em
  `expo-secure-store`, sobrevive a reabrir o app) — `refreshUser()` foi
  ajustado pra **não** mais resetar o workspace ativo (bug que teria sido
  introduzido: antes ele reatribuía `workspaceId` pro `defaultWorkspaceId`
  toda vez, o que desfaria a troca de workspace sempre que a tela de
  verificar e-mail chamasse `refreshUser`).
- Pill "nome do workspace ▾" no topo do Resumo (`(tabs)/index.tsx`), leva pra
  `/workspaces`. NavRow "Workspaces" na aba Contas.
- Telas: `/workspaces` (lista + trocar ativo + criar), `/workspaces/new`,
  `/workspaces/[id]/members` (mudar papel via Dialog+Select, remover/sair),
  `/workspaces/[id]/invite` (form de convite + lista de pendentes com
  revogar), `/invites` (convites recebidos + aceitar).
- Sem tela de "decidir" (aceitar/recusar) — spec só menciona aceitar ou deixar
  expirar pra convite de workspace (diferente do fluxo de transferência do
  M3, que tem recusa explícita) — não implementado por não estar no escopo.
- `bunx tsc --noEmit`: limpo, exceto os erros de typed-routes já conhecidos
  (grupo de rota `(app)/...` não reconhecido no caminho "achatado" pelo
  gerador — mesma classe dos 6 erros pré-existentes em
  accounts.tsx/cards/categories, confirmados inofensivos via `expo export -p
  web`, que gerou todas as rotas novas como estáticas válidas).

## Ajuste pós-teste manual do usuário (2026-07-16, rodada 2)

- **Faltava editar o workspace** — só dava pra criar, nunca renomear depois.
  Adicionado `PATCH /workspaces/:workspaceId` (`update-workspace.ts`, guard
  `admin` — owner e admin podem, member/viewer não), vale pra qualquer tipo de
  workspace (inclusive o `personal` — nada no spec proíbe renomear "Pessoal").
  Mobile: ícone de lápis ao lado do nome em `/workspaces` (só visível pra
  quem é owner/admin daquele workspace), abre um `Dialog` simples de
  renomear. Corrigido de passagem: `workspaceApi.create`/`update` estavam
  tipados como `WorkspaceSummary` (que inclui `role`), mas a resposta crua
  de criar/editar não tem esse campo — novo tipo `WorkspaceInfo` sem `role`.
  Teste novo + validado ao vivo (renomear funciona; não-membro tentando
  renomear recebe 404 genérico; nome vazio é rejeitado). Suite: **45/45**.

## Ajustes pós-teste manual do usuário (2026-07-16)

Dois gaps reais encontrados testando o app de verdade:

- **`createWorkspace` não fazia o onboarding** — só o registro criava
  categorias padrão + banco/conta zerada (spec: "ao criar workspace, seed de
  categorias padrão + criação guiada da primeira conta/cartão — nunca deixar
  o usuário numa tela vazia" vale pra **qualquer** criação de workspace, não
  só o do registro). `create-workspace.ts` agora replica exatamente o que
  `register.ts` já fazia. Teste novo confirma (`workspace.test.ts`).
- **UI escondia "Membros" pro workspace `personal`** — decisão minha, não do
  spec; o backend já permitia convidar/gerenciar membros em qualquer tipo de
  workspace desde o início. Removida a restrição em
  `workspaces/index.tsx` — "Membros" aparece pra todo workspace.

Também corrigido durante a re-verificação: um `pendingRole as never` em
`members.tsx` (cast pra escapar do type checker em vez de tipar certo) virou
`pendingRole as WorkspaceRole`.

**Lição operacional**: `bun run <script>` neste ambiente (Windows/Git Bash)
spawna um processo filho que faz o trabalho de verdade — matar o PID que o
bash reporta (`$!`/nohup) só derruba o processo-pai, o filho continua
servindo na porta. Da próxima vez, matar por porta
(`Get-NetTCPConnection -LocalPort N | Select OwningProcess` → `Stop-Process`)
em vez de confiar no PID do `nohup ... &`.
