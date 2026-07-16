# 07 — Deep link pros e-mails de auth (reset de senha / verificação de e-mail)

**Status:** 🟡 Implementado, não testado em device (2026-07-15).

## Contexto

As telas de "esqueci minha senha"/"redefinir senha"/"verificar e-mail" (adicionadas em
2026-07-15) usam **entrada manual do token colado** — os e-mails enviados pelo backend
apontam pra `${APP_URL}/reset-password?token=...` e `.../verify-email?token=...`, que
hoje não é nem uma página web (não existe dashboard ainda) nem um deep link do app
mobile (`scheme: "mobile"` já configurado em `app.json`, mas os templates de e-mail
não usam esse scheme).

## Escopo

- Trocar a construção do link nos e-mails
  (`apps/backend/src/application/use-cases/auth/{forgot-password,register}.ts`) pra
  usar o deep link do app (`mobile://reset-password?token=...`,
  `mobile://verify-email?token=...`) em vez de `APP_URL`.
- Configurar o `expo-router` pra capturar esse link e abrir a tela certa com o token
  pré-preenchido no campo (mantendo o campo editável como fallback, pra quando o
  usuário copia/cola manualmente também continuar funcionando).
- Testar em dispositivo real ou emulador (deep link não é totalmente simulável só com
  `expo export -p web`).

## Decisão de produto em aberto

Talvez valha esperar até existir uma landing page web (M4) que funcione nos dois casos
(quem abre no celular vs. no desktop, ex. e-mail lido no computador) antes de investir
nisso — ou aceitar que por enquanto só funciona bem se o usuário ler o e-mail no
próprio celular onde o app está instalado.

## Próximo passo

Implementar o deep link do lado mobile (capturar `?token=` da URL de entrada) e do
lado backend (trocar a URL do e-mail), aceitando a limitação de "só funciona se abrir
no celular com o app instalado" por enquanto.

## Implementação (2026-07-15)

- Backend: `forgot-password.ts`/`register.ts` agora montam `resetUrl`/`verifyUrl` com
  `mobile://reset-password?token=...` e `mobile://verify-email?token=...` (scheme
  hardcoded, sem env var nova). `bun run typecheck` e `bun test` (25 pass) limpos —
  `extractToken(url)` nos testes continua funcionando pois `new URL(...)` parseia
  scheme customizado com query string normalmente.
- Mobile: `reset-password.tsx`/`verify-email.tsx` usam `useLocalSearchParams<{ token?: string }>()`
  e passam `defaultToken` pro `ResetPasswordForm`/`VerifyEmailForm`, que usam
  `defaultToken ?? ''` no `defaultValues.token` do `useForm` (campo continua editável).
  `bunx tsc --noEmit` limpo nesses arquivos (erros pré-existentes em
  `accounts.tsx`/`cards/index.tsx`/`categories/index.tsx`, não relacionados) e
  `expo export -p web` gerou as rotas `/reset-password` e `/verify-email` sem erro.

**Pendência:** não foi possível testar a abertura real do deep link
(`mobile://reset-password?token=...` / `mobile://verify-email?token=...`) — isso
exige device/emulador com o app instalado simulando o clique no link do e-mail.
Falta validar num device de verdade antes de marcar como concluída.
