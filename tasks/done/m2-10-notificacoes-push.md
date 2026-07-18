# M2-10 — Sistema de notificações + push

**Status:** 🟢 Concluída (2026-07-16) — ampliada além do escopo original a
pedido do usuário: virou um sistema de notificações genérico (não só push de
fatura/recorrência), com leitura/arquivamento e configuração por tipo.

## Contexto

Spec (Milestones, M2): "notificações push (fatura fechou/vence, recorrência a
confirmar)". Pedido do usuário (2026-07-16) ampliou o escopo: sistema de
notificações estruturado e genérico (não só os 3 tipos do spec), por usuário,
com marcar como lida, arquivar/ver arquivadas, e uma tela de configuração pra
desativar por tipo — além de mover a descoberta de convites de workspace pra
dentro desse sistema (antes era um card em `/workspaces`).

## Escopo entregue

### Backend
- 3 tabelas novas: `notifications` (por usuário, tipo extensível via enum,
  `data` jsonb livre pra deep-link, `read_at`/`archived_at`), 
  `notification_preferences` (por usuário+tipo; ausência de linha = habilitado),
  `push_tokens` (um usuário pode ter vários devices).
- Módulo `notification`: `GET/POST /notifications[...]` (listar
  ativas/arquivadas, marcar lida, arquivar/desarquivar — sempre checando que a
  notificação é do próprio usuário), `GET/PATCH /notification-preferences[/:type]`,
  `POST/DELETE /push-tokens`.
- `createNotification` (helper interno, não é rota): checa a preferência
  antes de criar — desabilitado = não cria nada, nem in-app nem push (decisão:
  "desativar por tipo" é tudo ou nada, não só silenciar o push).
- Push via **Expo Push Service** (`https://exp.host/--/api/v2/push/send`,
  fetch cru — sem `expo-server-sdk`, pra não trazer dependência só por um
  request HTTP simples), job `push.send` no BullMQ (M2-01).
- **Sweep diário** (`notification/sweep.ts`, `setInterval` de 24h dentro do
  próprio `main/worker.ts` — sem cron/BullMQ repeatable, mais simples e
  suficiente): antecipa parte do M2-09/M2-10 do spec —
  - Fatura `open` cujo `closing_day` já passou → persiste a transição pra
    `closed` (igual à leitura lazy já fazia) + notifica `invoice_closed`.
  - Fatura `closed` (não paga) cujo `due_day` é hoje → notifica `invoice_due`.
  - Recorrência ativa com ocorrência prevista pra hoje e ainda não confirmada
    → notifica `recurring_pending`. Na época em que essa nota foi escrita o
    M2-09 (auto-lançamento) ainda não existia — hoje ele já roda antes
    desse aviso no mesmo sweep (ver [[m2-09-auto-lancamento-recorrencias]]),
    então na prática esse caminho só dispara pra recorrências que o
    auto-lançamento não conseguiu confirmar sozinho.
  - Dedup por `entityKey` (`data->>'entityKey'`) — rodar de novo não duplica.
- Convite de workspace (`create-invite.ts`) agora notifica o convidado (se ele
  já tem conta) — mesma lógica de "só quando é e-mail e o usuário existe" que
  já valia pro e-mail de convite.

### Mobile
- **Nova 4ª aba "Avisos"** na tab bar (antes era um card em `/workspaces` —
  pedido explícito do usuário de mudar a localização).
- Tela de notificações: toggle Ativas/Arquivadas, ícone por tipo, indicador de
  não lida, tocar marca como lida e navega pro destino (convite → `/invites`,
  fatura → `/cards/[cardId]`, recorrência → `/explore`), botão de
  arquivar/desarquivar.
- `/notification-settings`: switch por tipo (rótulo + descrição em
  português), acessível pelo ícone de engrenagem na aba de Avisos.
- `expo-notifications` + `expo-device`: pede permissão, pega o token do Expo
  Push Service e registra no backend no login/boot; desregistra no logout;
  toque numa notificação do sistema (app em background/fechado) navega pro
  destino via listener no `_layout.tsx` raiz.

## Migração pra dev build (pré-requisito de push no Android)

Decisão fechada com o usuário: **build local** (Android Studio já instalado),
**só Android por agora** (iOS continua no Expo Go, sem a limitação de push).

- `app.json`: `android.package`/`ios.bundleIdentifier`
  (`com.matheuspa.financeguide`) adicionados — exigidos pelo `expo prebuild`
  e ausentes até então. Plugin `expo-notifications` registrado.
- `npx expo prebuild --platform android` gerou `android/` (gitignorado, como
  já prevista — task 01 do widget também vai usar essa mesma pasta).
- `npx expo run:android` — build + instalação no emulador Android já
  disponível neste ambiente (`emulator-5554`).

## ⚠️ Pendência real: credencial FCM pro Android

Sair do Expo Go resolve o bloqueio de *rodar* push no Android, mas o Expo
Push Service (`exp.host`) só entrega de verdade se o **projeto Expo tiver um
`projectId` (via `eas init`, gratuito) e credencial Firebase Cloud Messaging
configurada** (Google descontinuou o FCM legado que a Expo gerenciava sozinha
antes do SDK 53). Sem isso: o app builda e roda normalmente, a permissão e o
registro de token funcionam, mas o envio real pelo Expo pode falhar
silenciosamente (a chamada any `push.send` do worker não vai lançar erro pro
usuário — só loga `job_failed`).

**Isso não foi resolvido nesta leva** — exige conta Expo (grátis) + projeto
Firebase (grátis) que só o usuário pode criar. O sistema já está pronto pra
funcionar assim que isso existir; nenhum código muda, só a configuração
externa.

## Testes

Backend: `notification.test.ts` (8 casos — criação respeita preferência,
ciclo de vida ler/arquivar/desarquivar com checagem de dono, preferências
default habilitadas, convite notifica o convidado, sweep de fatura
fechou/vence e recorrência pendente com dedup). Suite completa: **53/53
passando**.
