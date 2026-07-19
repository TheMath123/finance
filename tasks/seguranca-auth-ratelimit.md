# Auditoria de segurança independente — autenticação, autorização, IDOR e rate limiting (backend inteiro)

**Data:** 2026-07-19
**Escopo:** `apps/backend` inteiro — todos os módulos HTTP (`auth`, `workspace`, `bank`,
`account`, `card`, `category`, `transaction`, `recurring`, `summary`, `notification`,
`whatsapp`, `transfer`, `split`), não só M3. Segunda rodada de auditoria de segurança da
sessão, focada especificamente em auth/autorização/IDOR/rate limit (as outras rodadas
cobriram M3 isolado e integrações externas/segredos — ver `tasks/m3-gaps-seguranca.md` e
`tasks/seguranca-integracoes-segredos.md`).
**Método:** leitura de `guards.ts` inteiro; grep de `requireAuthenticated(`/`requireWorkspaceRole(`
em todas as rotas (`http/modules/**/routes/*.ts`) pra montar a tabela completa de guard×rota;
leitura de todos os repositórios em `infra/db/repositories` procurando `findById` sem escopo de
workspace/usuário fora dos já revisados no M3; leitura de todos os use-cases de
`application/use-cases/auth/*`; grep de CORS/headers de segurança em `main/*.ts`. Sem execução,
sem correção — só levantamento para decisão humana. **Não repete** achados já registrados e
fechados em `tasks/m3-gaps-seguranca.md` (rotas de transfer/split sem rate limit específico,
upload de anexo, etc.) — quando o mesmo tema reaparece aqui é porque foi confirmado um padrão
mais amplo (fora do M3) ou uma variante nova, explicitado em cada item.

---

## Tabela de guards (visão completa)

Todas as ~68 rotas protegidas do backend chamam `requireAuthenticated` ou
`requireWorkspaceRole` — **nenhuma rota "esquecida" sem guard nenhum** foi encontrada (as únicas
rotas sem chamada de guard são as 7 pré-autenticação de `/auth` — `register`, `login`,
`refresh`, `logout`, `forgot-password`, `verify-reset-code`, `reset-password`, `verify-email` —
e o `whatsapp/webhook`, todas com verificação própria: rate limit por IP + lockout, ou HMAC).

`minRole` está consistente em todo o backend: `viewer` pra leitura, `member` pra
mutação de nível "transação" (criar/editar/excluir transação, recorrência, split, criar
transferência, pagar fatura), `admin` pra estrutural/destrutivo (excluir/arquivar
conta/banco/cartão/categoria, gestão de workspace, convites, export CSV). Não encontrei
nenhum caso de `minRole` baixo demais pra o que a ação faz.

Rotas que usam só `requireAuthenticated` (sem `:workspaceId` no path, autorização feita dentro
do use case) — já era um padrão conhecido do M3 pras 5 rotas de transfer/split; a lista completa
no backend inteiro é bem maior — ver achado #3.

---

## Achados

### 1. [Baixo] Oracle de existência em `revokeInvite` — 403 revela que um convite existe em workspace alheio, quebrando o padrão de 404 genérico usado em todo o resto do backend

**Arquivos:**
- `apps/backend/src/application/use-cases/workspace/revoke-invite.ts:12-16`
- `apps/backend/src/http/modules/workspace/errors.ts:21,27`

**Problema:** `revokeInvite` busca o convite por `findById(inviteId)` (sem escopo de
workspace — não existe outro jeito, é rota top-level) e só DEPOIS checa
`getMemberRole(invite.workspaceId, userId)`. Se o convite não existe: `invite_not_found` (404).
Se existe mas o ator não é admin daquele workspace: `forbidden` (403). São dois status/códigos
diferentes — ao contrário do padrão já estabelecido (e corretamente usado) em
`accept-transfer`/`reject-transfer` (`not_recipient` e `transfer_not_found` compartilham o
mesmo 404 genérico) e em `confirm-share`/`cancel-split` (mesma coisa). Aqui, um usuário
autenticado qualquer que possua (ou adivinhe) um `inviteId` consegue diferenciar "não existe"
de "existe, mas não é meu workspace" só pelo status code.

**Por que a severidade é baixa, não média/alta:** `inviteId` é UUID v4 (`packages/db/src/schema/workspace-invite.ts:19`,
helper `id()` — não sequencial, não enumerável por força bruta). O vazamento só se realiza se o
atacante já tiver o ID por algum outro canal (o que normalmente só acontece se ele já é o
próprio convidado, caso em que a existência não é segredo pra ele mesmo).

**Mitigação sugerida:** alinhar com o padrão já usado no resto do backend — se `!invite || !roleAtLeast(role, "admin")`, retornar sempre `invite_not_found` (404), independente de qual das duas condições falhou.

---

### 2. [Baixo/Informativo] Mesmo padrão em `acceptInvite` (variante mais branda)

**Arquivo:** `apps/backend/src/application/use-cases/workspace/accept-invite.ts:17,31`

**Análise:** `invite_not_found` (404) vs `invite_forbidden` (403, quando o e-mail/telefone do
convite não bate com o do usuário logado) tem a mesma estrutura do achado #1. Severidade menor
porque, ao contrário de `revokeInvite`, o `inviteId` aqui é normalmente entregue **diretamente**
ao convidado (link de e-mail/WhatsApp) — quem tem o ID legítimo já sabe que o convite existe.
O risco residual é só pra um terceiro que capture/adivinhe o ID de convite de outra pessoa.
Mantido como informativo — mesma mitigação do achado #1 se quiser fechar os dois juntos
(um `invite_not_found` genérico pros dois casos), mas o ganho de segurança real aqui é marginal.

---

### 3. [Médio] Confirmado: o padrão "rota sem `:workspaceId` no path = zero rate limit" do M3 se repete em bem mais rotas fora do M3 — e uma delas é uma ação destrutiva e irreversível

**Arquivos:**
- `apps/backend/src/http/modules/auth/routes/delete-account.ts` (`DELETE /auth/me`)
- `apps/backend/src/http/modules/auth/routes/index.ts:16-24` (`RATE_LIMITS`, não inclui `/auth/me`)
- `apps/backend/src/http/modules/workspace/routes/revoke-invite.ts`, `accept-invite.ts`
- `apps/backend/src/http/modules/whatsapp/routes/revoke-link.ts`
- `apps/backend/src/http/modules/transfer/routes/remove-trusted-contact.ts`, `list-pending-transfers.ts`, `list-transfer-accounts.ts`, `list-trusted-contacts.ts`
- `apps/backend/src/http/modules/split/routes/list-owed.ts`
- `apps/backend/src/http/modules/workspace/routes/create-workspace.ts`, `list-my-workspaces.ts`, `list-my-invites.ts`
- `apps/backend/src/http/modules/notification/routes/*` (mark-read, archive/unarchive, preferences, push-tokens)

**Problema:** confirmado — o padrão já identificado no M3 (rotas que usam só
`requireAuthenticated`, sem `workspaceId` na URL, não passam pelo limite geral de 300/min de
`requireWorkspaceRole` e não têm limite específico próprio) é sistêmico, não isolado ao M3.
A maioria dessas rotas é leitura ou uma mutação de baixo impacto e auto-escopada (o próprio
usuário só afeta os próprios dados: sair de convite, remover contato confiável, revogar vínculo
do WhatsApp) — nesses casos a ausência de rate limit é um gap arquitetural real mas de risco
prático baixo.

**O caso que se destaca: `DELETE /auth/me` (exclusão da própria conta, LGPD, irreversível).**
Diferente do `/auth/login`, que tem DUAS camadas de proteção (rate limit por IP, 10/min, `RATE_LIMITS`
em `auth/routes/index.ts:18` + lockout progressivo por conta, `login.ts:24-40`), o `/auth/me`
(delete):
1. Não está na tabela `RATE_LIMITS` de `auth/routes/index.ts` → nenhum limite por IP.
2. Usa só `requireAuthenticated` → não passa pelo limite geral de 300/min de `requireWorkspaceRole`.
3. `deleteAccount` (`application/use-cases/auth/delete-account.ts:36-37`) reautentica por senha,
   mas não incrementa nenhum contador de tentativa nem aciona o lockout usado no login —
   é um `hasher.verify` isolado, sem qualquer estado entre tentativas.

**Cenário de exploração:** um atacante que obtenha um access token válido de curta duração (15
min, mas renovável enquanto tiver o refresh token — ex. via XSS no app, token vazado em log,
device comprometido) pode tentar senhas contra `DELETE /auth/me` sem nenhuma fricção — nem IP
rate limit, nem lockout de conta, nem o limite geral de usuário. Isso não é uma rota de alto
tráfego esperado (então CPU/infra não é o risco), mas é a única combinação no backend de "ação
irreversível" + "reautenticação sem qualquer throttle".

**Mitigação sugerida:** adicionar `/auth/me` (método DELETE) na tabela `RATE_LIMITS` de
`auth/routes/index.ts` (ex. 5/hora por IP, similar ao `forgot-password`), e/ou reusar
`nextLockoutState`/`isLocked` (já existe em `domain/services/lockout-rules.ts`) pra contar
falhas de reautenticação nesse endpoint também, não só no login.

---

## Verificado e está ok

- **IDOR sistemático em repositórios não-M3:** `card.repository.ts`, `bank.repository.ts`,
  `category.repository.ts`, `recurring.repository.ts` só expõem consultas já escopadas por
  workspace (`findInWorkspace`/`findActiveInWorkspace`) — não existe `findById` cru nesses
  quatro repositórios. Os métodos de mutação (`update`/`delete`/`setArchived`) recebem só o ID
  (sem `workspaceId`), mas confirmei em `delete-card.ts`, `archive-card.ts`, `delete-bank.ts`,
  `delete-category.ts` (e os equivalentes de update) que **todos** passam por
  `findInWorkspace(actor.workspaceId, id)` antes, retornando `*_not_found` se não achar — a
  mutação sem escopo só é alcançável depois da posse confirmada.
- **`invoice.repository.ts` tem `findById` sem escopo**, usado em exatamente um lugar
  (`transaction/helpers.ts:7`, `isInPaidInvoice`) — recebe `tx.invoiceId`, onde `tx` já veio de
  `transaction.findInWorkspace` no caller (`delete-transaction.ts:14`, `update-transaction.ts:23`).
  Não é input direto do usuário. Seguro.
- **`notification.repository.ts` tem `findById`/`markRead`/`archive`/`unarchive` sem escopo de
  usuário** (recebem só o `id`) — mas as três use-cases que chamam essas mutações
  (`mark-read.ts`, `archive-notification.ts`) sempre checam
  `notification.userId !== userId` antes, retornando `notification_not_found` (404 genérico)
  pros dois casos (não existe / não é seu). Seguro e consistente com o padrão de oracle do
  resto do backend.
- **`trusted-contact.repository.delete(id, userId)`** já filtra por `userId` no próprio SQL
  (`and(eq(id), eq(userId))`) — defesa em profundidade mesmo que o use-case esquecesse de checar
  (não esquece: `removeTrustedContact` não faz outra checagem porque não precisa).
- **Reset de senha / verificação de e-mail / vínculo do WhatsApp (M1, revisado de novo agora):**
  todos os tokens (`email_verification`, `password_reset`, código de vínculo WhatsApp) são
  gerados aleatoriamente (`crypto.getRandomValues`), armazenados só como hash SHA-256
  (`token.repository.ts`), únicos por `usedAt`/deleção-ao-usar, e validados com checagem de
  expiração na própria query (`findValidAuthToken`/`findValidAuthTokenForUser`, `gt(expiresAt, now)`).
  Gerar um novo token invalida os anteriores não usados. `resetPassword` revoga TODAS as sessões
  ativas (`deleteAllRefreshByUser`) — OWASP-compliant.
- **Rate limit em login/registro/reset (M1, revisado de novo):** `auth/routes/index.ts` aplica
  limite por IP em `register` (5/h), `login` (10/min), `refresh` (30/min),
  `forgot-password`/`verify-reset-code`/`reset-password`/`verify-email` (5-10/min ou /h),
  **e** os use-cases somam um segundo limite por e-mail-alvo (`forgot:${email}` 3/h,
  `reset-code:${email}` 5/15min compartilhado entre `verify-reset-code` e `reset-password`).
  `login.ts` ainda soma lockout progressivo por conta (5 falhas → trava 1/5/15/60 min,
  `lockout-rules.ts`) e comparação de hash "dummy" pra não vazar existência de e-mail por
  timing. Camadas redundantes bem desenhadas — nenhum gap aqui além do já descrito no achado #3
  (que é sobre `/auth/me`, não sobre estas rotas).
- **Senha:** bcrypt cost 12 via `Bun.password` (`bun-password-hasher.ts`) — adequado.
- **Access/refresh token:** JWT HS256 15min (access) + opaco 256-bit hasheado em SHA-256
  (refresh, rotacionado a cada uso em `refresh.ts:19`) — sem achados novos.
- **Guard mapping:** nenhuma rota autenticada sem guard nenhum; nenhum `minRole` baixo demais
  encontrado em nenhum módulo (ver tabela acima).
- **CORS:** não existe nenhuma configuração (`grep` por `cors`/`Access-Control` em
  `apps/backend/src` não retornou nada). **Não é explorável hoje** — os únicos clientes são o
  app mobile (Expo/React Native, sem modelo de origem de browser) e o WhatsApp webhook
  (server-to-server); sem CORS configurado, um browser em outra origem nem consegue LER a
  resposta (fetch cross-origin sem `Access-Control-Allow-Origin` é bloqueado pelo próprio
  browser) — ou seja, hoje o efeito prático é "ninguém de fora consegue chamar via browser",
  não "aberto pra qualquer origem". Isso muda quando o M4 (dashboard web em Svelte, já
  planejado) começar: nesse ponto CORS vai precisar existir só pra o dashboard funcionar, e o
  risco é alguém configurar `origin: true`/wildcard sob pressão de prazo em vez de uma allowlist
  explícita. Deixado como nota pro planejamento do M4, não como vulnerabilidade atual.
- **Headers de segurança (HSTS, X-Content-Type-Options, CSP):** nenhum configurado — baixa
  prioridade pra uma API JSON pura sem superfície de renderização HTML hoje; mesma
  recomendação de revisar quando M4 servir HTML de verdade.

---

## Resumo

3 achados novos nesta rodada, nenhum Alto/Crítico: 1 Médio (achado #3 — `DELETE /auth/me`
sem qualquer rate limit ou lockout, ao contrário de `/login`, numa ação irreversível) e 2
Baixo/Informativo (achados #1 e #2 — oracle de existência 403-vs-404 em `revokeInvite`/
`acceptInvite`, inconsistente com o padrão de 404 genérico usado em todo o resto do backend,
mas de exploração improvável dado UUID v4 não-enumerável). Mais importante: confirmei que o
padrão "rota sem `:workspaceId` = zero rate limit", já achado no M3 só pra 5 rotas de
transfer/split, é sistêmico no backend inteiro (dezenas de rotas) — a maioria de baixo risco
(leitura/auto-escopada), exceto a exclusão de conta, que merece a mesma proteção de IP-limit +
lockout que o login já tem. Fora isso, a camada de auth (tokens, senha, sessão, lockout,
rate limit em cascata) e a checagem de posse de recurso (guards + `findInWorkspace` em todos os
módulos revisados: card, bank, category, invoice, notification, trusted-contact) estão sólidas
e consistentes — nenhum IDOR explorável encontrado fora do que o M3 já havia coberto.

## Ações tomadas (2026-07-19)

Achado #3 corrigido:
- `apps/backend/src/http/modules/auth/routes/index.ts`: chave do `RATE_LIMITS`
  passou a incluir o método (`"DELETE /auth/me"`), evitando colisão com o
  `GET /auth/me` que compartilha o mesmo path; limite de 5/hora por IP.
- `apps/backend/src/application/use-cases/auth/delete-account.ts`: reautenticação
  agora passa pelo mesmo lockout progressivo do login (`isLocked`/`nextLockoutState`,
  campos `failedLoginAttempts`/`lockedUntil` compartilhados de propósito — qualquer
  tentativa repetida de adivinhar a senha, via login ou reauth, trava a conta).
- Teste novo em `auth.test.ts`: 5 reautenticações erradas travam a conta tanto
  pra `deleteAccount` quanto pro `login` subsequente. Suíte: 153/153 passando.
