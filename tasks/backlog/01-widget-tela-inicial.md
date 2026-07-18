# 01 — Widget de tela inicial (Android)

**Status:** 🔵 Backlog — decisão tomada (2026-07-15): deixar pra depois do resto do M1
fechar. Não bloqueia nenhuma funcionalidade financeira do app.

## Contexto

A spec (visão geral + milestone M1) descreve um widget de resumo financeiro (saldo +
próxima fatura) usando `react-native-android-widget` (JSX → RemoteViews), com cache
local (AsyncStorage) atualizado pelo app + `requestWidgetUpdate()`.

## Por que ainda não foi iniciada

Pré-requisito bloqueante: **dev build via `expo prebuild`** — Expo Go não suporta
widget nativo. Isso significa sair do fluxo atual (rodar direto no Expo Go) e passar a
gerar/versionar (ou gerar sob demanda) as pastas nativas `android`/`ios`, que hoje nem
existem no repo (`.gitignore` do app já as tem listadas: `/ios`, `/android` — sinal de
que o time já previu isso, mas ainda não aconteceu).

É uma mudança de fluxo de desenvolvimento pra todo o time, não só uma feature — por isso
está marcada como "precisa de decisão" em vez de simplesmente entrar na fila.

## Próximo passo

1. Decidir: vale sair do Expo Go agora, ou empurrar o widget pra depois do resto do M1
   fechar? O widget não bloqueia nenhuma outra funcionalidade financeira do app.
2. Se decidido seguir: `npx expo prebuild` pra gerar as pastas nativas, instalar
   `react-native-android-widget`, criar o componente JSX do widget (saldo + próxima
   fatura), configurar `AppWidgetProvider` no `android/`, e o mecanismo de
   atualização (`requestWidgetUpdate()` chamado pelo app sempre que o resumo mudar).
