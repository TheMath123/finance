# M2-04 — Tela de atividade do workspace (leitura do AuditLog)

**Status:** 🟢 Concluída (2026-07-16).

## Contexto

`AuditLog` é write-only desde o M1 (toda mutação já grava `create/update/
delete/restore` com `entity`/`entity_id`/`user_id`) — o spec já reserva
explicitamente a leitura pro M2: "M2 = leitura — endpoint + tela de 'atividade
do workspace', junto com o compartilhamento." É essencial assim que workspaces
passam a ser compartilhados (spec: "essencial nos compartilhados: 'quem
excluiu isso?'").

## Escopo

### Backend
- `GET /workspaces/:id/activity` — paginado, filtrável por entidade/usuário/
  período; join com `users` pra exibir nome de quem fez a ação (`user_id`
  pode ser nulo se o usuário foi excluído — exibir "usuário removido").

### Mobile
- Tela "Atividade" (acessível a partir do workspace, provavelmente junto do
  seletor/configurações do workspace da task [[m2-02-workspaces-compartilhamento]]):
  lista cronológica "Fulano editou uma transação", "Beltrano excluiu um
  cartão", com ícone por tipo de ação.

## Dependências

Faz mais sentido logo após [[m2-02-workspaces-compartilhamento]] (workspace
compartilhado de verdade é o que torna essa tela útil — hoje, sozinho num
workspace pessoal, o log só mostraria as próprias ações do usuário).

## Próximo passo

Rota de leitura primeiro (é simples — só falta o endpoint, o dado já existe
há meses); tela depois.

## Implementação (2026-07-16)

- `GET /workspaces/:workspaceId/activity` (guard `viewer` — qualquer membro
  vê a atividade), filtros opcionais `entity`/`userId`/`from`/`to` +
  paginação `limit`/`offset` (mesmo padrão de `listTransactionsSchema`).
- `AuditRecorder` (port) ganhou `list()` além do `record()` já existente —
  join com `users` pra trazer o nome de quem fez a ação; `userName: null`
  quando o usuário foi excluído (`onDelete: "set null"` já existia desde o
  M1, não precisou de migração).
- Mobile: tela `/workspaces/[id]/activity` (lista cronológica com ícone por
  tipo de ação — criar/editar/excluir/restaurar), acessível a partir de
  `/workspaces` ao lado de "Membros".
- Testes novos: entrada de atividade aparece com o nome certo; ação de um
  usuário depois excluído aparece anonimizada (`userId`/`userName` nulos).
  Suite completa: **44/44 passando**. Validado ao vivo via curl (criar
  categoria → `GET .../activity` retorna a entrada com o nome do autor).
- **Fora do escopo, documentado, não implementado**: `create-invite.ts` não
  grava entrada no AuditLog (só as mutações de membership/workspace já
  gravavam). Se fizer sentido auditar "quem convidou quem" mais pra frente,
  é um adendo pequeno e isolado — não bloqueia esta task.
