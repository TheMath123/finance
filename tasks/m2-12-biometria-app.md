# M2-12 — Biometria para abrir o app

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Spec (Milestones, M2): "biometria para abrir o app". Puramente mobile, sem
mudança de backend — trava a UI localmente até autenticação biométrica, os
tokens já vivem no `expo-secure-store`.

## Escopo

- `expo-local-authentication`: pedir Face ID/Touch ID/fingerprint na
  abertura do app (ou ao voltar do background após X minutos).
- Configuração opcional nas configurações do usuário (ligar/desligar).
- Fallback pro PIN/senha do dispositivo quando a biometria falha ou não está
  configurada (comportamento padrão da lib).
- Não substitui login — é uma trava adicional sobre uma sessão já autenticada
  (não mexe no fluxo de `SessionProvider`/tokens).

## Dependências

Nenhuma — completamente independente das outras tasks do M2.

## Próximo passo

Decidir o gatilho exato: só na abertura fria do app, ou também ao retornar do
background (mais seguro, mais fricção) — alinhar com o usuário antes de
implementar.
