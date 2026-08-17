# M5-06b — Login social com Google (app mobile)

**Status:** ⚪ Aguardando terceiro (usuário criar Client IDs no Google Cloud
Console) — código implementado e testado em 2026-08-17.

## Contexto

Fase 2 de [[m5-06-oauth-login-social-google]] (backend + dashboard, já
concluída). O backend já estava pronto pra receber os tokens do mobile —
`POST /auth/google`, `POST /auth/me/google/link`, `POST
/auth/me/google/unlink` são os mesmos endpoints do dashboard, sem nenhuma
mudança necessária.

## Por que entra em `validations/` e não em `backlog/`

O código já está pronto e passou por typecheck/lint/`expo prebuild` do
monorepo inteiro. O que falta é **liberação de terceiro** (usuário criar os
Client IDs iOS/Android no Google Cloud Console — só ele tem acesso a essa
conta) e, depois disso, **revalidar manualmente** o fluxo real de login,
já que nada disso pode ser testado de dentro do repo sem essas credenciais.

## Mudança de plano: `expo-auth-session` → `@react-native-google-signin/google-signin`

O escopo original (task nascida em `backlog/` antes desta rodada) previa
`expo-auth-session`. Seguindo a própria regra do `apps/mobile/AGENTS.md`
("Expo HAS CHANGED — ler a doc versionada exata antes de codar"), a doc
atual do Expo 57 (`docs.expo.dev/versions/v57.0.0/sdk/auth-session`) foi
consultada antes de escrever qualquer código — e ela **não recomenda mais**
o fluxo genérico via browser pra Google, e sim a lib oficial do provedor:
`@react-native-google-signin/google-signin`. Essa lib devolve o `idToken`
direto do seletor nativo do Google (sem PKCE, sem client secret no app, sem
redirect via browser) — mais simples e mais segura que `expo-auth-session`
genérico pra esse caso específico.

Trade-off aceito: é módulo nativo (não roda mais no Expo Go puro — exige
`expo prebuild` + dev build, mesma mecânica que o `release-mobile.yml`
(build de APK) já usa).

## Bundle id / package name mudou

`com.matheuspa.financeguide` (nome pessoal, de antes do domínio existir) →
**`app.marcelus.mobile`** (reverse-DNS de `marcelus.app`, mesmo padrão de
sufixo por serviço já usado no resto do projeto: `marcelus-app` no Fly,
`marcelus-dashboard`/`marcelus-site` no Cloudflare). Trocado exatamente
agora — antes de qualquer Client ID do Google ou publicação em loja existir
— pra não precisar refazer o cadastro depois.

## O que foi implementado

- `apps/mobile/package.json`: `@react-native-google-signin/google-signin`
  (versão fixa, mesma política do resto do repo).
- `apps/mobile/app.config.ts`: plugin `@react-native-google-signin/google-signin`
  registrado (via `plugins`, junto dos já existentes de `app.json`),
  `iosUrlScheme` lido de `GOOGLE_IOS_URL_SCHEME` (build-time, não
  `EXPO_PUBLIC_*`) — cai num placeholder inerte quando a env não existe,
  senão o plugin quebra o `expo prebuild` mesmo em build Android-only (ele
  exige a opção incondicionalmente).
- `apps/mobile/app.json`: `ios.bundleIdentifier`/`android.package` →
  `app.marcelus.mobile`.
- `src/env.ts` + `.env.example`: `EXPO_PUBLIC_CLIENT_ID`,
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME` — todos
  opcionais, o app funciona normalmente sem eles (só o botão de Google some).
- `src/lib/hooks/use-google-auth.ts`: `signInWithGoogle()` (seletor nativo →
  `idToken`, `null` se cancelou, erros comuns tratados com mensagem em
  pt-BR) + `signOutGoogleLocally()` (chamado no `signOut` da sessão).
- `src/lib/auth-api.ts`: `googleLinked` no tipo do usuário (o backend já
  devolvia, só não estava tipado) + `googleSignIn`/`linkGoogle`/`unlinkGoogle`.
- `src/components/ui/google-auth-button.tsx`: botão reutilizável.
- `login-form.tsx`/`register-form.tsx`: botão "Continuar com Google".
- `profile.tsx`: card "Conta Google" com Vincular/Desvincular
  (`user.googleLinked` decide qual mostrar; desvincular pede confirmação).
- `.github/workflows/release-mobile.yml`: repo Variables
  `EXPO_PUBLIC_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  injetadas no build do APK.

## Como destravar (só o usuário consegue)

1. No mesmo projeto do Google Cloud Console usado pro Client ID "Web
   application" (Fase 1, dashboard), criar:
   - Client ID tipo **Android** — package `app.marcelus.mobile` + SHA-1 do
     keystore de debug (`cd apps/mobile && npx expo prebuild --platform
     android && cd android && ./gradlew signingReport`, ou direto via
     `keytool -list -v -keystore android/app/debug.keystore -alias
     androiddebugkey -storepass android -keypass android` se o Android SDK
     não estiver instalado localmente — keystore de debug do Expo é fixo,
     mesmo valor sempre, local ou no CI).
   - Client ID tipo **iOS** — bundle id `app.marcelus.mobile`. Anotar o
     "iOS URL scheme" (client id invertido, tipo
     `com.googleusercontent.apps.123-abc`).
2. Preencher `apps/mobile/.env`:
   `EXPO_PUBLIC_CLIENT_ID` (mesmo valor do dashboard — é o único client
   que entra em código/env; ver seção abaixo pra entender por quê),
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME`.
3. No GitHub: repo Variables `EXPO_PUBLIC_CLIENT_ID` e
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (pro `release-mobile.yml`).

Sem esse checklist, o app builda e roda normalmente — só o botão "Continuar
com Google" fica invisível (`EXPO_PUBLIC_CLIENT_ID` vazio).

### O client Android não entra em `GOOGLE_CLIENT_IDS` nem em nenhuma env

Diferente do que o texto original deste arquivo dizia ("somar todos os IDs
em `GOOGLE_CLIENT_IDS`") — corrigido depois de checar com mais cuidado como
a lib funciona: `GoogleSignin.configure()` só aceita `webClientId` (server)
e `iosClientId` — não existe parâmetro `androidClientId`. No Android, o
Play Services usa o client cadastrado no Console (pacote + SHA-1)
**automaticamente**, sozinho, só pra confirmar a identidade do app — o
valor do client ID em si nunca aparece em código nem em env. E o `idToken`
que sai do celular sempre tem como `aud` (audience) o client **Web**
(é literalmente o papel do `webClientId` — "prove que esse token é pro seu
backend"), não importa a plataforma de origem. Então `GOOGLE_CLIENT_IDS` no
backend só precisa do client Web, que já deveria estar lá desde a Fase 1.

## O que precisa ser revalidado depois do checklist acima

- [ ] Login com Google numa conta nova (sem cadastro prévio) — confirma
      criação automática de usuário + workspace pessoal.
- [ ] Login com Google numa conta que já existe (criada via esse mesmo
      e-mail Google antes) — confirma que reloga em vez de duplicar.
- [ ] Cadastro com e-mail que já tem conta por senha — confirma que cai no
      erro `google_email_registered` (pede login com senha).
- [ ] Vincular Google pelo perfil de uma conta já logada por senha —
      confirma o check de e-mail igual (`google_link_email_mismatch` se
      tentar com Google de e-mail diferente).
- [ ] Desvincular Google pelo perfil — confirma que continua entrando por
      senha depois.
- [ ] Cancelar o seletor nativo do Google no meio do fluxo — confirma que
      não aparece erro nenhum (só volta pro estado anterior).

## Verificação já feita (sem depender do checklist)

- `bunx expo config --json` — plugin resolve sem erro.
- `bunx expo prebuild --platform android --clean` — sucesso local.
- `bun run typecheck` (monorepo inteiro) + `bun run lint` — limpos.

## Atualização (M5-07, 2026-08-14)

Avatar (upload manual + exibição da foto do Google) **não estava bloqueado
por isso** e já tinha sido implementado antes desta rodada — mobile
mostra/edita a foto de perfil normalmente (`profile.tsx`), independente do
login social.
