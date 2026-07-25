# M4-10 — Notificações no dashboard (paridade com o mobile)

**Status:** 🟢 Concluída (2026-07-25, validada ponta a ponta com SSE real)

## Contexto

Levantamento feito em 2026-07-25 (endpoint por endpoint, backend x dashboard)
mostrou o módulo `notification` inteiro (`GET /notifications`,
mark-read/archive/unarchive, preferências por tipo, `GET
/notifications/stream` via SSE, push tokens) 100% ausente do dashboard —
nenhum arquivo `notification-api.ts`, nenhuma tela. O app mobile já tem sino
+ tela de notificações + preferências desde antes do M4; esta task fecha a
mesma paridade na web, como parte de "finalizar o sistema" junto com o
superadmin (M4-08/M4-09, ainda em backlog).

Decisão de escopo: `push-tokens` (registro de device token) fica de fora —
é conceito mobile-only (push nativo), sem equivalente útil num browser sem
Web Push configurado. `recurring_pending`/confirmação de ocorrência
(fluxo do M2-09) também não ganhou tela aqui, mesma decisão já tomada no
M4 anterior pra recorrências (só o CRUD do template, não a confirmação).

## Escopo

- `notification-api.ts` server-side (list/mark-read/archive/unarchive/
  preferências), espelhando `Notification`/`NotificationPreference` do
  backend.
- Proxy de mutação (`+server.ts` sob `/notifications/[notificationId]/...`
  e `/notification-preferences/[type]`) — o sino e a página usam `fetch`
  direto (não form actions) porque a lista precisa se comportar como uma
  inbox reativa, não uma página que recarrega a cada ação.
- Proxy do SSE (`/notifications/stream`) — `EventSource` nativo do browser
  não manda header `Authorization` custom, então o proxy anexa o Bearer
  token server-side e reencaminha o `ReadableStream` da resposta do
  backend.
- Sino na topbar (`notification-bell.svelte`, Popover + Badge do
  shadcn-svelte, instalados via CLI) com contagem de não lidas e lista
  recente; store client-side em runas (`notifications.svelte.ts`,
  singleton) inicializado com o load do layout e mantido ao vivo via SSE.
- Página `/notifications` — abas Ativas/Arquivadas + seção de
  Preferências (toggle por tipo via `Switch`), mesmos textos/ícones do
  mobile (`TYPE_LABELS`/`TYPE_ICONS`, traduzidos pra Phosphor Svelte).

## Bug de infraestrutura encontrado e corrigido

O proxy SSE ficava "pendurado" — nenhum client (nem `curl`, nem `fetch`
do Node/Bun, nem `http.request` cru) recebia sequer os headers da
resposta. Diagnóstico (via socket cru, comparando timing): o servidor HTTP
do Bun/Elysia só libera *headers + body* da resposta streaming quando o
primeiro dado é efetivamente escrito no `ReadableStream` — e como o
heartbeat da rota (`apps/backend/src/http/modules/notification/routes/stream.ts`)
só rodava a cada 25s, a conexão inteira ficava sem nenhum byte trafegado
até esse primeiro heartbeat. Fix: enfileirar um comentário SSE
(`: connected\n\n`) imediatamente no `start()` do stream, antes de
qualquer heartbeat — headers passam a chegar em ~20ms. Comentários SSE
(linhas iniciadas com `:`) são ignorados pelo `EventSource` por spec, então
não quebra nenhum client existente (mobile incluso).

## Validação

`bun run lint` (Biome, monorepo inteiro), `svelte-check` do dashboard,
`tsc --noEmit` de todos os pacotes, suíte completa do backend (177 testes),
build de produção do dashboard. E2E manual real: login via
`/auth/login`, registro de um segundo usuário, convite de workspace do
primeiro pro segundo (dispara `workspace_invite` de verdade pelo
`createNotification`), stream do convidado conectado simultaneamente —
evento chegou ao vivo pelo proxy da dashboard. Confirmado também
mark-read, archive, unarchive e toggle de preferência (com persistência
checada direto no backend).

## Pendências fora de escopo

Split e Transfer (transferência entre usuários) continuam 100% ausentes
do dashboard — não fazem parte desta task, ficam pro planejamento de um
próximo milestone se o dashboard for cobrir fluxos "sociais" também.
