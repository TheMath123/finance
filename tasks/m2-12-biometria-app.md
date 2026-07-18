# M2-12 — Biometria para abrir o app

**Status:** 🟢 Concluída.

## Contexto

Spec (Milestones, M2): "biometria para abrir o app". Puramente mobile, sem
mudança de backend — trava a UI localmente até autenticação biométrica, os
tokens já vivem no `expo-secure-store`.

**Decisões tomadas sem bloquear (2026-07-18, ver relatório final da sessão
pra revisão do usuário):**
- **Gatilho:** trava sempre no cold start **e** ao voltar do background
  depois de mais de 2 minutos — comportamento parecido com apps bancários
  (ex.: Nubank), mais adequado a um app de finanças pessoais do que só
  cold-start. Retornos rápidos (troca de app, notificação) não pedem
  biometria de novo.
- **Disponibilidade do toggle:** mostrado quando `hasHardwareAsync()` é
  `true` (o aparelho tem sensor), independente de já haver biometria
  cadastrada — a lib já cai pro PIN/senha do aparelho automaticamente
  quando a biometria falha ou não está configurada (comportamento padrão
  documentado do `expo-local-authentication`, é exatamente o que o spec
  pediu).

## Implementação

- `expo-local-authentication` instalado via `expo install` (não `bun add`
  cru). Plugin de config adicionado em `app.json` com
  `faceIDPermission` (obrigatório pra Face ID no iOS).
- `lib/secure-store.ts` — `biometricStore`: preferência liga/desliga
  (`"1"/"0"`, mesmo storage dos tokens por simplicidade — não é segredo).
- `context/biometric-lock.tsx` — `BiometricLockProvider`/`useBiometricLock`:
  - No mount: checa `hasHardwareAsync()` + a preferência salva; se ambos
    ok, já nasce travado (`locked=true`) — cold start sempre pede.
  - `AppState` listener: guarda o timestamp de quando o app foi pro
    background/inactive; ao voltar pra `active`, tranca de novo só se
    passou de 2min.
  - `unlock()`: chama `LocalAuthentication.authenticateAsync`.
- `components/biometric-lock-screen.tsx` — tela cheia (ícone + texto +
  botão "Desbloquear"), dispara a autenticação sozinha assim que aparece
  (evita exigir toque extra), com retry manual se falhar.
- `app/(app)/_layout.tsx` — `BiometricLockProvider` envolve o Stack; um
  componente filho (`AppStack`) decide entre mostrar a tela de bloqueio ou
  o Stack normal. Fica **dentro** do guard de sessão (`if (!user) redirect
  /login`) — spec: não substitui login, é uma trava a mais sobre uma
  sessão já autenticada.
- `app/(app)/profile.tsx` — card "Travar com biometria" com `Switch`,
  visível só quando `hasHardwareAsync()` é `true`.

## Testes

- Typecheck do mobile limpo.
- Smoke test via bundle web (mesmo procedimento do M2-08): subiu o Metro,
  bateu em `/` e `/profile` via curl — 200, sem erro de bundling/runtime
  (o `expo-local-authentication` tem implementação `.web.ts`, então nem
  quebra o bundle web).
- **Não dá pra testar automaticamente:** o fluxo real de biometria
  (`authenticateAsync`, prompt do sistema, retorno do background) só roda
  de verdade num dispositivo físico ou simulador com biometria simulada —
  não existe teste automatizado de UI nesse projeto (nem para as outras
  telas), e simular sensor biométrico está fora do alcance de terminal/
  CI. Ver relatório final pra roteiro de verificação manual.

## Dependências

Nenhuma — completamente independente das outras tasks do M2.
