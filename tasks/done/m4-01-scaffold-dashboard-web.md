# M4-01 — Scaffold do dashboard web + autenticação

**Status:** 🟢 Concluída (2026-07-24) — validada pelo usuário: login ponta a
ponta contra o backend real funcionando no browser. Cookies de sessão
renomeados pra `_ta`/`_rr` a pedido do usuário (nomes curtos, não anunciam o
que carregam).

## Contexto

Primeira task do M4 (`spec.md`, "Dashboard web"). Cria o app novo do zero —
hoje `apps/` só tem `backend/` e `mobile/`. Stack já fechada no spec
(2026-07-15): **Svelte** (framework), **Bits UI** (componentes headless,
equivalente ao Base UI que é React-only), **Tailwind CSS** nativo (sem
NativeWind), **Zod** pra formulário e env. Pré-requisito de tudo que vem
depois no M4.

**Regra de arquitetura fechada em 2026-07-24 (`spec.md`, "Dashboard web"):**
toda requisição à API do backend (e a qualquer outro serviço externo) é
feita **só do lado servidor** do SvelteKit — nunca `fetch` direto do
client pro backend. Token de sessão, URL interna do backend e qualquer
segredo/env sensível nunca chegam ao bundle do browser. É obrigatório e
vale para toda tela do M4, não só o login (detalhes de como aplicar isso
no login, na seção "Decisões já fechadas" abaixo).

## Escopo

### Novo app — `apps/dashboard/`
- Scaffold via `bunx sv create` (SvelteKit, o scaffold oficial — nunca
  montar `vite.config.ts`/roteamento à mão) + `bunx sv add tailwindcss`.
- `bunx shadcn-svelte init` ou instalação manual do Bits UI conforme a
  skill/CLI oficial da lib — componentes primitivos copiados pra
  `src/lib/components/ui/` (mesmo padrão do mobile: registry copiada, não
  dependência opaca).
- `src/lib/server/env.ts` — Zod schema pras envs do dashboard, **todas
  privadas** (`API_URL` do backend, nada de prefixo `PUBLIC_` pra nada
  que aponte pra infra ou segredo — só usar `PUBLIC_` se um dia existir
  algo genuinamente inofensivo de expor, o que hoje não é o caso);
  validado no boot; `.env.example` próprio do app (convenção já usada em
  `apps/backend/.env.example` e `apps/mobile/.env.example`).
- `src/lib/server/api-client.ts` — cliente HTTP pro backend, **só
  importável de código server-side** (pasta `lib/server/` do SvelteKit é
  bloqueada de import no client por padrão — usar essa proteção, não
  confiar só em convenção de nome). Fetch tipado, tratamento de erro
  consistente com o `Either`/formato de erro que o backend já devolve
  (ver `apps/backend/src/http/http-error.ts`), injeta o Bearer token lido
  do cookie de sessão (`event.cookies`) em toda chamada.
- **Nenhum `+page.svelte`/componente client faz `fetch` pro backend
  diretamente** — todo dado vem via `load` (`+page.server.ts`/
  `+layout.server.ts`) ou é enviado via `actions`/`+server.ts`. Páginas
  client só recebem os dados já resolvidos pelo servidor.

### Backend — CORS
- `apps/backend/src/main/app.ts` **não tem plugin de CORS hoje** (só
  serve o app mobile via fetch nativo, sem origem de browser). Como toda
  chamada ao backend agora parte do **servidor** do SvelteKit (server-to-
  server, não browser-to-backend), CORS deixa de ser estritamente
  necessário pro fluxo normal — mas vale manter o plugin `@elysiajs/cors`
  mesmo assim, restrito à origem do dashboard (env `DASHBOARD_ORIGIN`),
  como defesa em profundidade caso algum `+server.ts` do dashboard vire
  proxy direto no futuro.

### Autenticação web
- Reaproveita as rotas de `auth` que já existem (`login`, `register`,
  `refresh`, `logout`, `me` em
  `apps/backend/src/http/modules/auth/routes/`) — **não duplicar lógica
  de autenticação no backend**, só adaptar como o token é entregue/guardado.
- Telas: `src/routes/login/+page.svelte`, `src/routes/register/+page.svelte`
  — formulário usa `actions` em `+page.server.ts` (nunca chama o backend
  do client); a action recebe usuário/senha, chama `login()` no servidor
  via `lib/server/api-client.ts`, e é quem seta o cookie de sessão na
  resposta (`cookies.set(..., { httpOnly: true, ... })`).
- Guard de rota autenticada: `src/routes/(app)/+layout.server.ts`
  redireciona pra `/login` sem sessão válida (lê o cookie, nunca expõe o
  token pro componente `.svelte`).

## Dependências

Nenhuma — é o ponto de partida do M4.

## Decisões já fechadas (2026-07-24 — não reabrir)

- **Token fica em cookie `httpOnly` + `SameSite=Lax`**, setado pela
  `action` de login (`+page.server.ts`), nunca em `localStorage`/memória
  do client. O backend não muda contrato nenhum (continua devolvendo o
  token no corpo, igual faz pro mobile) — só quem lê/guarda/reenvia o
  cookie é o SvelteKit, inteiramente no servidor.
- **Toda busca de dado autenticado passa por `load` server-side**
  (`+page.server.ts`/`+layout.server.ts`), nunca no client — é a mesma
  regra geral de "requisição só do servidor" aplicada à navegação normal,
  não só ao login.

## Implementação (2026-07-24)

- **Scaffold**: `bunx sv create apps/dashboard --template minimal --types ts
  --add "tailwindcss=plugins:none" prettier eslint "sveltekit-adapter=adapter:node"
  --install bun`. Pacote renomeado pra `@finance/dashboard` (padrão do
  monorepo) + script `typecheck` (`svelte-check`) pro turbo.
- **shadcn-svelte** (Bits UI por baixo): `init --preset b0` (a CLI só aceita
  código de preset gerado no site, não nomes tipo "lyra" — `b0` é o default;
  descoberto lendo o bundle da CLI, os nomes `vega/lyra/...` só funcionam no
  prompt interativo). `iconLibrary` trocado pra `phosphor` na
  `components.json` (convenção do projeto). Componentes: `button`, `input`,
  `label`, `card` em `src/lib/components/ui/`.
- **Paleta**: `src/routes/layout.css` reescrito com os mesmos tokens do app
  mobile (`apps/mobile/src/global.css` — teal/vermelho/verde + slate, radius
  8px), incluindo o token `success` e variantes `chart-*`/`sidebar-*`
  derivadas da mesma paleta. Fonte Inter (mesma do Figma).
- **Server-only** (regra do spec, tudo em `src/lib/server/` — o SvelteKit
  proíbe import dessa pasta em código client):
  - `env.ts` — Zod, só `API_URL` (privada, sem `PUBLIC_`), validada no boot.
  - `api-client.ts` — `apiRequest<T>` tipado com `Either` do
    `@finance/shared` (dep workspace nova + `ssr.noExternal` no Vite, o
    pacote exporta TS puro), timeout 15s, espelha o envelope `HttpError` do
    backend.
  - `auth-api.ts` — login/register/refresh/logout/me espelhando os contratos
    reais (`AuthSession`, `MeOutput`).
  - `session.ts` — cookies `httpOnly` + `SameSite=Lax` (`secure` fora de
    dev), refresh transparente: access expirado → tenta `/auth/refresh` →
    rotaciona os dois cookies.
- **Auth**: `hooks.server.ts` popula `locals.session` a cada request
  (`app.d.ts` tipa `App.Locals`); `routes/login` e `routes/register` com
  `actions` server-side (Zod client-side em `lib/schemas/auth.ts` espelhando
  o backend, `use:enhance` pra progressive enhancement); guard em
  `(app)/+layout.server.ts` (redirect pra `/login`); home placeholder em
  `(app)/+page.svelte` com logout (action em `routes/logout`).
- **CORS (backend)**: `@elysiajs/cors` em `main/app.ts` restrito a
  `DASHBOARD_ORIGIN` (env nova no schema + `.env.example`, default
  `http://localhost:5173`) — defesa em profundidade, o fluxo normal é
  server-to-server.
- **Lint**: regra `svelte/no-navigation-without-resolve` desligada só pra
  `src/lib/components/ui/**` (código de registry); nas páginas próprias os
  links usam `resolve()`.

Verificado: `bun run typecheck` (8/8 pacotes), `bun run lint` e
`bun run build` (adapter-node) limpos.

## Complemento: recuperação de senha (2026-07-29)

Gap percebido pelo usuário testando o dashboard: o backend já expõe
`/auth/forgot-password`, `/auth/verify-reset-code` e `/auth/reset-password`
(mesmo fluxo usado pelo app mobile — `forgot-password.tsx` →
`reset-password.tsx` → `new-password.tsx`), mas o dashboard só tinha
`login`/`register`/`logout`. Implementado espelhando exatamente o fluxo do
mobile, adaptado pra rotas SvelteKit (query string em vez de route params
do Expo Router pra carregar e-mail/código entre os 3 passos):

- `lib/schemas/auth.ts`: `forgotPasswordSchema`, `verifyResetCodeSchema`
  (código de 6 dígitos), `newPasswordSchema` (com `refine` de confirmação).
- `lib/server/auth-api.ts`: `forgotPassword`, `verifyResetCode`,
  `resetPassword`.
- Três rotas novas: `/forgot-password` (e-mail → redireciona pro passo 2
  com o e-mail na query), `/reset-password` (e-mail+código, com botão
  "Reenviar código" via `fetch` direto pra `?/resend`, sem navegar) e
  `/new-password` (exige e-mail+código na query — `load` redireciona de
  volta pro passo 2 se faltar algum).
- Link "Esqueci minha senha" adicionado no cabeçalho do campo de senha da
  tela de login.

**Bug real encontrado e corrigido durante a validação**: a rota
`/reset-password` tinha uma action `default` (verificar código) e uma
action nomeada `resend` (reenviar) no mesmo arquivo — SvelteKit **proíbe**
misturar `default` com actions nomeadas no mesmo `+page.server.ts`
("When using named actions, the default action cannot be used"), o que
quebrava com **500 em qualquer submit** (só não aparecia no `svelte-check`
porque é uma regra de runtime, não de tipo). Só foi pego rodando um smoke
test real via `curl` contra o dev server — corrigido renomeando a action
principal pra `verify` (`action="?/verify"` no form).

Validado: `svelte-check` (0 erros), `prettier --check` + `eslint` (0
problemas), build de produção limpo, e smoke test via `curl` cobrindo os 5
caminhos principais (e-mail/código inválidos, código correto rejeitado
pelo backend, reenvio, guarda de `/new-password` sem query, senhas não
coincidindo) — todos retornando o `fail`/`redirect` esperado, sem erro 500.
Não foi possível validar o fluxo 100% ponta a ponta com um código real
(sem acesso à caixa de e-mail do Resend nesta sessão).

## Critério de conclusão

Login funcionando ponta a ponta contra o backend real (mesmo usuário do
app), sessão persistindo entre reloads, logout limpando a sessão. Nenhuma
chamada ao backend parte do bundle do client (conferir via devtools/
Network do browser — só deve aparecer requisição pro próprio domínio do
dashboard, nunca direto pro backend). Nenhuma env sem prefixo `PUBLIC_`
acessível via `import.meta.env`/bundle do client. Typecheck
(`svelte-check`) limpo.
