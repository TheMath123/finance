# M5-06 — Auth em padrão OAuth + login social com Google (Fase 1: backend + dashboard)

**Status:** 🟢 Concluída (2026-08-14), validada com testes reais contra
Postgres + typecheck/lint/build em backend e dashboard. Fase 2 (mobile) fica
em [`backlog/m5-06b-google-login-mobile.md`](../backlog/m5-06b-google-login-mobile.md) —
bloqueada por pré-requisito externo (Client IDs iOS/Android no Google Cloud
Console).

## Contexto

Auth era 100% e-mail/senha, sem nenhum resquício de OAuth/provider externo.
Pedido do usuário: preparar o sistema pra um padrão OAuth-friendly,
multi-provedor, que não precise ser refeito quando entrar o próximo provedor
(Apple etc.), e entregar Google funcionando agora. Decisão fechada com o
usuário antes de implementar (via AskUserQuestion): se o e-mail do Google já
tiver conta por senha, **rejeitar** pedindo pra entrar com senha ou
redefinir — vincular a conta ao Google fica pra depois, feito manualmente já
logado (fora de escopo desta rodada, mas o desenho já deixa isso trivial).

## Decisão de arquitetura: backend só valida o ID token, não conduz o redirect OAuth

Duas formas de integrar Google existiam: (A) o backend conduz a Authorization
Code completa (redireciona, recebe callback, troca code por tokens com client
secret); ou (B) cada cliente obtém o ID token direto do Google (Google
Identity Services no browser, `expo-auth-session` no mobile) e manda só esse
token pro backend validar. **Escolhida: (B)** — reaproveita `issueSession`/
`AuthSession` sem tocar em `hooks.server.ts`, guard, `resolveSession`,
`SessionProvider` do mobile ou refresh do `api-client.ts`; nenhum client
secret em lugar nenhum (GIS e Authorization Code+PKCE de client público não
precisam); um único endpoint `POST /auth/google` atende dashboard e mobile —
só muda a lista de audiences aceitas.

## Implementação

### Schema (migration única, aditiva)

Tabela nova `oauth_accounts` (`packages/db/src/schema/oauth-accounts.ts`):
`userId` (FK cascade pra `users`), `provider` (`text` livre, não `pgEnum` —
evita `ALTER TYPE` a cada provedor novo), `providerAccountId` (claim `sub`
do Google), `email` (informativo). Unique index em
`(provider, providerAccountId)`. Tabela separada de `users` (não campo a
mais nela) pra permitir, no futuro, uma mesma conta linkar Google + Apple +
senha ao mesmo tempo.

`users.passwordHash` continua `NOT NULL`, sem migration nela — contas
só-Google recebem um hash de valor aleatório de 32 bytes
(`deps.hasher.hash(deps.tokens.generateOpaque().raw)`) que nunca bate com
senha nenhuma; login por senha nessas contas falha do jeito normal
(`invalid_credentials`), zero `if` novo em `login.ts`.

### Backend

- `application/ports/google-identity-verifier.ts` — porta estreita
  (`GoogleIdentityVerifier`/`GoogleIdentity`), sem vazar tipos do SDK do
  Google, mesmo padrão de `PaymentGateway`. `infra/security/
  google-identity-verifier.ts` usa `google-auth-library`
  (`OAuth2Client().verifyIdToken`) — lib oficialmente recomendada pelo
  Google. `infra/security/fake-google-identity-verifier.ts` — fake
  programável (`Map<idToken, GoogleIdentity | null>`) pros testes, zero
  rede. `UseCaseDeps.googleIdentity` injetado em `composition.ts` (real) e
  `test/deps.ts` (fake).
- `application/use-cases/auth/create-personal-workspace.ts` — extraído de
  `register.ts` (workspace "Pessoal" + membership owner + categorias
  padrão + banco/conta padrão), reaproveitado pelo fluxo de Google pra não
  duplicar a lógica de onboarding.
- `application/use-cases/auth/google-sign-in.ts` — fluxo: verifica o ID
  token → `!emailVerified` rejeita → busca `oauth_accounts` por
  `(google, sub)`: achou → carrega o usuário vinculado (rejeita se
  suspenso ou sem `defaultWorkspaceId`) → `issueSession`; não achou →
  busca `users` por e-mail: já existe → `left('google_email_registered')`;
  não existe → cria usuário + workspace pessoal + marca e-mail verificado
  + insere `oauth_accounts`, tudo dentro de `deps.uow.run(...)`, mesmo
  catch de `isUniqueConstraintError` do `register.ts` pra corrida rara.
- `AuthError` ganha `google_token_invalid`/`google_email_unverified`/
  `google_email_registered`; `AUTH_ERRORS` (http) mapeia os 3 (401/401/409
  — a de `google_email_registered` já vem com a mensagem pronta pedindo
  senha ou reset, sem tradução própria no client).
- `googleSignInSchema` (Zod: `idToken` + `termsAccepted: true`), rota
  `POST /auth/google` (mesmo padrão fino de `register.ts`), rate limit
  igual ao login (10/min por IP).
- Env `GOOGLE_CLIENT_IDS` (lista separada por vírgula, default vazio —
  não trava o boot se ainda não configurada; Fase 2 só acrescenta
  iOS/Android na mesma variável).
- Dependência nova: `google-auth-library@11.0.0` (pin exato — `11.0.2` foi
  descartada por violar o `minimumReleaseAge` de 7 dias do `bunfig.toml`).

### Dashboard

- `PUBLIC_GOOGLE_CLIENT_ID` — primeira env **pública** do dashboard
  (`$env/static/public`, convenção nativa do SvelteKit); todo o resto já
  era `lib/server/env.ts` privado.
- `lib/components/auth/google-sign-in-button.svelte` — carrega
  `https://accounts.google.com/gsi/client` em runtime (sem SDK/pacote
  novo), `google.accounts.id.initialize` + `renderButton`; callback recebe
  o `credential` (ID token) direto no browser. Legenda pequena substitui
  checkbox de termos (clique = consentimento, padrão usual de botão
  OAuth). Componente não renderiza nada se `PUBLIC_GOOGLE_CLIENT_ID`
  estiver vazia (setup manual ainda não feito). Tipagem do `window.google`
  isolada em `google-identity.d.ts` (um `declare global` dentro do
  `<script>` de um `.svelte` não é permitido pelo compilador — precisa
  viver num módulo `.d.ts` à parte).
- `lib/server/auth-api.ts` ganha `googleSignIn`. Rota nova
  `routes/login/google/+server.ts` (só `POST`, sem página) — separada de
  `login/+page.server.ts` porque aquele arquivo já tem uma action
  `default` e SvelteKit não deixa misturar `default` com actions
  nomeadas no mesmo arquivo. Devolve JSON (`{ok:true}`), nunca
  `redirect()` — quem chama é um `fetch` do callback do GIS, que segue
  redirect automaticamente e devolveria o HTML da página final como corpo
  em vez de navegar o browser; o próprio client faz
  `window.location.href = '/'` depois do fetch dar certo.
- Botão + divisor "ou" adicionados em `login/+page.svelte` e
  `register/+page.svelte`.

### Testes

`application/use-cases/auth/auth.test.ts`, novo describe "auth: login
social Google" (6 casos, com `FakeGoogleIdentityVerifier` via
`createTestDeps`): token inválido, e-mail não verificado, e-mail já
cadastrado por senha, usuário novo (workspace/categorias/banco/conta +
`oauth_accounts` + e-mail já marcado verificado no banco), login de
retorno na mesma conta/workspace, conta suspensa rejeita login de
retorno.

## Validação final

- `bun run typecheck --filter=@finance/backend` — limpo.
- `bun test src/application/use-cases/auth/auth.test.ts` (contra Postgres
  real via `docker compose up postgres` + `bun run db:migrate`) — **29
  pass, 3 fail**; as 3 falhas são pré-existentes e não relacionadas
  (`Bun.CryptoHasher.update` quebrando em `verify-email`/lockout — bug de
  ambiente/versão do Bun, arquivos não tocados nesta task; reportado à
  parte, não corrigido aqui).
- `bun run lint` (Biome, monorepo) — limpo.
- `docker build -f apps/backend/Dockerfile .` real (não só `--dry-run`) —
  buildou sem repetir nenhum dos problemas de dependência já enfrentados
  nesta sessão (`.dockerignore`, linker hoisted, `minimumReleaseAge`);
  confirmado `google-auth-library` resolvendo dentro da imagem final.
- Dashboard: `svelte-check` (0 erros — só 5 warnings pré-existentes,
  não relacionados, em `notifications/+page.svelte` e
  `reset-password/+page.svelte`), `eslint` limpo, `prettier --check`
  limpo (exceto 1 warning pré-existente não relacionado em
  `verify-email/+page.svelte`, não tocado), `build` de produção
  (`adapter-cloudflare`) ok.
- **Smoke manual do botão do Google (dashboard) não foi feito** — este
  ambiente não tem browser; fica por conta do usuário depois do setup
  manual abaixo.

## Setup manual pendente (só o usuário pode fazer, fora deste repo)

1. Criar/reaproveitar projeto no Google Cloud Console + tela de
   consentimento OAuth.
2. Client ID tipo "Web application" (origens JS autorizadas: domínio real
   do dashboard + `http://localhost:5173` em dev) → vira
   `PUBLIC_GOOGLE_CLIENT_ID` no dashboard e a primeira entrada de
   `GOOGLE_CLIENT_IDS` no backend.
3. `flyctl secrets set GOOGLE_CLIENT_IDS=...` no backend e configurar
   `PUBLIC_GOOGLE_CLIENT_ID` no Worker do Cloudflare (dashboard) — mesmo
   processo já usado pras envs anteriores.
4. Só depois disso o botão aparece de verdade (hoje fica invisível porque
   a env está vazia) — validar o clique real, criação de conta, rejeição
   de e-mail já cadastrado por senha.

## Fora de escopo desta rodada (documentado, não esquecido)

- Tela de "vincular Google" pra quem já está logado com senha — o desenho
  da tabela `oauth_accounts` já deixa isso trivial (só inserir uma linha
  depois de validar o ID token de novo), mas a UI fica pra depois.
- Deixar um usuário só-Google definir uma senha pela primeira vez (o fluxo
  de troca de senha atual exige saber a senha atual, que não existe nesse
  caso).
- Outros provedores (Apple, GitHub etc.) — o padrão criado aqui (porta +
  tabela + endpoint) já deixa o próximo barato, mas não é construído
  agora.
- Mobile (Fase 2) — ver
  [`backlog/m5-06b-google-login-mobile.md`](../backlog/m5-06b-google-login-mobile.md).

## Bug pré-existente encontrado (não corrigido aqui, fora de escopo)

Durante a rodada real de testes contra Postgres, 3 casos pré-existentes
(não relacionados a este trabalho, arquivos não tocados) falharam:
`Bun.CryptoHasher('sha256').update(raw)` em
`infra/security/jose-token-service.ts:10` lança
`TypeError: expected blob, string or buffer` ao processar uma string —
afeta `verifyEmail`/`forgotPassword`/lockout (qualquer fluxo que gera
token opaco de hash). Aparenta ser regressão da versão do Bun instalada
nesta máquina (`1.3.14`) mudando o contrato de `CryptoHasher.update`.
Vale investigar/corrigir numa task própria.
