# Microsoft Clarity (heatmap + gravação de sessão) — dashboard e mobile

**Status:** 🟢 Concluída (2026-08-15), validada com `typecheck`/`lint`/`build`
forçados (sem cache) em dashboard e mobile.

## Contexto

Pedido direto do usuário, encaixado durante a investigação de um erro real de
deploy (ver seção "Bug real encontrado" abaixo). Adicionar Microsoft Clarity
(heatmap + gravação de sessão) ao dashboard web e ao mobile, sem gate de
consentimento nesta rodada (decisão tomada por falta de resposta a tempo do
`AskUserQuestion` — segui a opção recomendada: MVP, sem banner de
consentimento; revisar depois se for preciso formalizar LGPD).

## O que foi implementado

### Dashboard (SvelteKit)

- `apps/dashboard/.env.example` — nova env pública `PUBLIC_CLARITY_PROJECT_ID`
  (não é segredo, só identifica o projeto no painel do Clarity).
- `apps/dashboard/src/routes/+layout.svelte` — injeta o script oficial do
  Clarity via `<svelte:head>{@html ...}</svelte:head>`, condicionado à env
  existir. `{@html}` foi necessário porque o snippet do Clarity precisa do
  project ID interpolado dentro do próprio `<script>`, e o Svelte não expande
  `{...}` dentro de tags `<script>` de template — a string é montada no
  `<script lang="ts">` do componente e injetada como HTML puro. O literal
  `</script>` dentro da string foi quebrado em `` `</` + `script>` `` pra não
  fechar prematuramente o `<script>` do próprio componente Svelte (mesmo
  arquivo).
  **Detalhe de sintaxe:** `<svelte:head>` não pode ficar dentro de um bloco
  `{#if}` (`svelte_meta_invalid_placement`) — a condicional tem que ficar
  *dentro* do `<svelte:head>`, não em volta dele.

### Mobile (Expo/React Native)

- `bun add @microsoft/react-native-clarity` (peer deps: `react-native-svg
  >=14.0.0`, já em `15.15.4` — compatível).
- `apps/mobile/.env.example` — nova env pública `EXPO_PUBLIC_CLARITY_PROJECT_ID`.
- `apps/mobile/src/app/_layout.tsx` — `useEffect` que chama
  `ClarityRN.initialize(projectId)` uma vez, só se a env existir **e** não
  estiver em `__DEV__` (não polui o painel com sessões de desenvolvimento).
- **Não validado ponta a ponta**: o SDK é nativo (autolinking), precisa de um
  rebuild (dev client/EAS) pra funcionar de verdade — não há como testar isso
  neste ambiente (sem device/simulador). `typecheck`/`lint` passam; o
  comportamento em runtime fica por conta do próximo build nativo.

## Bug real encontrado durante a investigação (não relacionado ao Clarity)

O usuário reportou um erro de deploy real (colado do log do CI):
```
Error: Module '"$env/static/public"' has no exported member 'PUBLIC_GOOGLE_CLIENT_ID'.
```

**Causa raiz, em duas camadas:**

1. **CI genuinamente quebrado.** `$env/static/public` é resolvida em tempo de
   build (Vite/SvelteKit), não runtime. `.github/workflows/ci.yml` e
   `deploy-dashboard.yml` rodavam `typecheck`/`build` do dashboard sem essa
   env definida no runner — corrigido adicionando
   `PUBLIC_GOOGLE_CLIENT_ID`/`PUBLIC_CLARITY_PROJECT_ID` ao `env:` de nível
   de job nos dois workflows (via `vars.*`, repository variable — não é
   segredo). Documentado em
   [`ci-cd-deploy.md`](../in-progress/ci-cd-deploy.md).
2. **Local também estava quebrado, só que mascarado por cache.** O `.env` que
   existia era o da **raiz do monorepo**, não `apps/dashboard/.env` — Vite
   resolve `$env/static/public` a partir do `envDir` do próprio projeto
   (`apps/dashboard`), não herda o `.env` da raiz mesmo que o Bun o carregue
   no `process.env` do processo pai. Isso significa que rodar
   `bun run typecheck` local nunca verificou essa env de verdade — só
   "passava" porque o Turbo cacheia por hash de arquivo (não por env var), e
   um cache antigo (de uma execução real de quando o `.env` existia no lugar
   certo) ficava sendo reproduzido em vez de re-executado. Só apareceu com
   `--force` (bypass de cache) — **lição registrada em `ci-cd-deploy.md`:
   sempre validar env-sensitive checks com `--force`.**
   Corrigido criando `apps/dashboard/.env` de verdade.

## Verificação

- `bunx turbo run typecheck --force` (todo o monorepo, sem cache) — 9/9 OK,
  0 erros.
- `bun run lint` (Biome, 756 arquivos) — sem problemas.
- `bunx turbo run build --filter=@finance/dashboard --force` — build OK
  (adapter Cloudflare).
- Mobile: só `typecheck`/`lint` — sem verificação de runtime (SDK nativo, ver
  nota acima).

## Fora de escopo (não pedido nesta rodada)

- Gate de consentimento (banner/opt-in) antes de carregar o Clarity.
- Configurar de fato o `PUBLIC_CLARITY_PROJECT_ID`/`EXPO_PUBLIC_CLARITY_PROJECT_ID`
  com um Project ID real — passo manual do usuário (ver checklist em
  `ci-cd-deploy.md`).
- Rebuild nativo do mobile pra validar o SDK funcionando de verdade.
