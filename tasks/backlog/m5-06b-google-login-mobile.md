# M5-06b — Login social com Google (app mobile)

**Status:** ⚪ Bloqueada — depende do usuário criar Client IDs iOS/Android
no Google Cloud Console.

## Contexto

Fase 2 de [[m5-06-oauth-login-social-google]] (backend + dashboard, já
concluída). O backend já está pronto pra receber os tokens do mobile —
`POST /auth/google` é o mesmo endpoint, só falta a lista `GOOGLE_CLIENT_IDS`
ganhar as audiences de iOS/Android e o app mobile obter o ID token via
`expo-auth-session`.

## Por que está bloqueada

Login social do Google no mobile precisa de Client IDs próprios (tipo iOS e
tipo Android) cadastrados no Google Cloud Console, vinculados ao bundle id
`com.matheuspa.financeguide` (já existente em `app.json`) e ao SHA-1 de
assinatura do app (Android). Só o usuário tem acesso ao Google Cloud
Console do projeto pra criar esses Client IDs — não é algo que dá pra fazer
de dentro do repo.

## Como destravar

1. No mesmo projeto do Google Cloud Console usado pro Client ID "Web
   application" (Fase 1), criar um Client ID tipo **iOS** (bundle id
   `com.matheuspa.financeguide`) e um tipo **Android** (mesmo bundle id +
   SHA-1 de assinatura do keystore de build).
2. Avisar quando os dois Client IDs existirem — aí sim retomamos esta task.

## Escopo (quando destravar)

- `npx expo install expo-auth-session` (fixar versão exata depois, mesma
  política de `bunfig.toml`/`.npmrc` já em vigor no repo).
- **Antes de escrever qualquer código**, seguir a regra do próprio
  `apps/mobile/AGENTS.md` ("Expo HAS CHANGED — ler a doc versionada exata
  antes de codar") e checar a doc atual do `expo-auth-session` pro
  provedor Google na versão do SDK em uso — a API de OAuth do Expo já
  mudou entre versões.
- `authApi.googleSignIn({idToken, termsAccepted})` espelhando o do
  dashboard, `POST /auth/google` com `skipAuth: true`.
- Botão de Google em `login-form.tsx`/`register-form.tsx`; ao obter o
  `idToken` via `expo-auth-session`, chama `authApi.googleSignIn` e no
  sucesso `session.signIn(result.value)` — sem nenhuma mudança em
  `context/session.tsx`, o `signIn` já aceita qualquer `AuthSession`.
- Backend: `GOOGLE_CLIENT_IDS` passa a levar 3 valores (web + iOS +
  Android), separados por vírgula — `flyctl secrets set` com a lista
  completa.
