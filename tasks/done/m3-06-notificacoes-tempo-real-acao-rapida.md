# M3-06 — Notificações em tempo real + ação rápida direto na notificação

**Status:** 🟡 Implementado (2026-07-22) — backend com testes de integração
reais e typecheck limpo dos dois lados, mas **sem validação manual num
device/emulador rodando de verdade** (ver "Próximo passo").

## Contexto

Dois problemas relatados na mesma conversa:

1. **Bug real**: clicar em "Confirmar recebimento" num split pendente não
   fazia nada. Causa raiz: `confirm-reimbursement.ts` só aceita a confirmação
   quando o participante (com conta na plataforma) já marcou `paid` — mas
   `splits.tsx` mostrava o botão sempre, e não havia nenhum tratamento de
   erro na tela (gap já conhecido em `tasks/m3-gaps-implementacao-pos-fix.md`),
   então o `invalid_transition` do backend desaparecia em silêncio.
2. **Pedido de UX**: transferências/splits pendentes "ficam escondidos"
   atrás de um item de menu — o usuário quer que cheguem como notificação de
   verdade, com ação direto nela, e que a tela de notificações atualize
   sozinha (SSE), sem precisar reabrir a aba.

## Escopo

### Bug do confirm (correção pontual)
- Backend expõe `participantUserId` na view "o que me devem"
  (`OwedToMeView`), pra tela saber quando a confirmação é realmente válida
  (mesma regra de `confirm-reimbursement.ts`: participante com conta precisa
  estar `paid`; externo pula direto de `pending`).
- `splits.tsx`: botão "Confirmar recebimento" só aparece quando válido;
  senão mostra "Aguardando [nome] marcar como pago". Erro de mutação agora
  aparece inline (mesmo padrão dos forms) em `splits.tsx` **e**
  `transfers/index.tsx` (tinha o mesmo gap).
- **Notificação nova**: `split_payment_paid` — hoje o criador só descobria
  que dava pra confirmar abrindo a tela sozinho; `mark-share-paid.ts` agora
  notifica o criador quando o participante marca como pago.

### Notificações em tempo real (SSE)
- `GET /notifications/stream` (`http/modules/notification/routes/stream.ts`)
  — autenticado por `Authorization: Bearer` normal (cliente RN consegue
  mandar headers custom num EventSource, diferente do browser). Heartbeat a
  cada 25s pra sobreviver a proxies que fecham conexão ociosa.
- **Bus de notificação** (`application/ports/notification-bus.ts` +
  `infra/realtime/redis-notification-bus.ts`) — pub/sub via Redis (não em
  memória): quem publica pode ser o processo da API **ou** o worker (sweep
  de fatura/recorrência, processo separado) — só Redis vê os dois. Uma única
  conexão Redis em modo subscribe (`psubscribe`) por processo, fan-out por
  usuário via `EventEmitter` local — não abre uma conexão Redis por SSE
  aberto. `createNotification` publica no bus toda vez que cria uma
  notificação (além do push já existente). Versão em memória
  (`in-memory-notification-bus.ts`) só pros testes.
- Mobile: `lib/notification-stream.ts` usa `react-native-sse` (RN não tem
  `EventSource` nativo com suporte a headers customizados). Reconecta
  proativamente a cada 10min (token de acesso dura ~15min) e força
  reconexão imediata se pegar 401 — sem isso o retry automático da lib
  ficaria reusando o header expirado pra sempre.
- `(app)/_layout.tsx` assina o stream enquanto logado e invalida as queries
  certas por tipo de notificação (`transfers-pending`,
  `splits-owed-by-me/to-me`, `my-invites`, `notifications`) — é isso que faz
  a lista/badge atualizar sozinha com o app aberto.

### Ação rápida direto na notificação
- Só pros 3 casos sem input extra do usuário: recusar transferência, marcar
  split como pago, confirmar recebimento de split. **Aceitar transferência
  fica de fora** — precisa escolher a conta de destino, não dá pra virar um
  botão de ação única.
- `push.send` (job) ganhou `categoryId` opcional — mapeado em
  `create-notification.ts` só pros 3 tipos acionáveis, repassado até
  `sendExpoPush` (campo `categoryId` da Expo Push API, que o device casa com
  a categoria registrada localmente via `identifier`).
- Mobile: `registerNotificationCategories` (`push-notifications.ts`)
  registra as 3 categorias com `Notifications.setNotificationCategoryAsync`.
  `addNotificationResponseListener` (renomeado de
  `addNotificationTapListener`) agora distingue toque no corpo (`kind:
  'tap'`, navega pro destino de sempre) de toque num botão de ação (`kind:
  'action'`) — esse último vai pro `notification-actions.ts` novo, que
  chama a API certa direto (sem abrir tela) e invalida as queries.
  `opensAppToForeground` fica no padrão (`true`): com `false` a ação não
  dispara se o app estiver morto (não só em segundo plano), e a ação
  precisa de JS rodando pra chamar a API — preferível abrir o app rapidinho
  a simplesmente não executar nada.

## Migração

`0016_productive_barracuda.sql` — `ALTER TYPE notification_type ADD VALUE
'split_payment_paid'`. Aplicada no Postgres local.

## Testes

Backend: 174/174 (suíte inteira), incluindo novo caso em `split.test.ts`
("criador precisa saber que já dá pra confirmar" — asserta
`split_payment_paid` na lista de notificações do criador depois do
`markSharePaid`). Typecheck limpo (`packages/db`, `apps/backend`,
`apps/mobile`).

## Próximo passo

Nada disto foi clicado num device/emulador de verdade ainda:
- Confirmar que o botão de split some/aparece certo conforme o status.
- Confirmar que a lista de notificações atualiza sozinha com o app aberto
  (SSE) — inclusive depois de reconectar (matar o app, reabrir).
- Testar os botões de ação na notificação **só funciona em dev build**
  (Android não suporta push no Expo Go desde o SDK 53 — mesma limitação já
  documentada em `expo-push.ts`); no iOS via Expo Go, confirmar se os
  botões de categoria aparecem (ação nativa depende do OS, não só do app).
