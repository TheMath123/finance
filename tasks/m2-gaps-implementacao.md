# Auditoria de fechamento — M2

**Data:** 2026-07-19
**Escopo:** M2 (compartilhamento de workspace + chatbot WhatsApp com IA + Redis/BullMQ
+ notificações push + export CSV + biometria) — as 12 tasks em `tasks/done/m2-01` a
`m2-12`, mais a task bloqueada `tasks/backlog/m2-06b-whatsapp-grupo-workspace.md`.

Contexto: todas as 12 tasks já estavam em `tasks/done/`, marcadas como concluídas e
validadas numa auditoria anterior desta mesma sessão. Esta auditoria releu cada task doc
e conferiu contra o código real (backend `apps/backend/src`, mobile `apps/mobile/src`),
sem assumir o status escrito. Rodei `bun --cwd=apps/backend test` (146/146 passando) e
`bun run typecheck` na raiz (limpo nos 6 packages que o rodam — ver gap #3 sobre por que
não são 7).

Instrução respeitada: não entrei em `**/transfer/**`, `**/split/**`, `**/attachment/**`
nem `packages/storage` (escopo do M3).

## Gaps encontrados

### 1. Aceitar convite de workspace não exige e-mail verificado

**Severidade:** Alta (contradiz uma regra de segurança fechada explicitamente no spec)
**Arquivo:** `apps/backend/src/application/use-cases/workspace/accept-invite.ts:28-31`
(cálculo de `matches`) e `apps/backend/src/application/use-cases/workspace/create-invite.ts`
(nenhum dos dois checa `emailVerifiedAt`)

**Descrição:** o spec fecha explicitamente (seção "Cadastro"): "recuperação de senha e
**convites de workspace** exigem e-mail verificado — evita que um typo de e-mail (ou o
e-mail de terceiro) receba links sensíveis." `forgot-password.ts` implementa essa regra
corretamente (`if (!user || !user.emailVerifiedAt) return right(null)`), mas
`accept-invite.ts` não tem checagem equivalente: ele casa `invite.emailOrPhone` contra
`user.email`/`user.phone` do usuário autenticado e aceita, sem nunca olhar
`emailVerifiedAt`. Não há teste em `workspace.test.ts` cobrindo esse cenário (confirmado
por busca — zero ocorrências de "emailVerified"/"verified" no arquivo de teste).

**Por que importa:** o cenário que o spec quer prevenir continua possível — se o
owner/admin do workspace digitar errado o e-mail do convidado (ou convidar
intencionalmente o e-mail de outra pessoa), quem tiver registrado uma conta com esse
e-mail — mesmo sem nunca ter provado posse da caixa de entrada (sem clicar no link de
verificação) — pode entrar em `/invites` e aceitar o convite, ganhando acesso aos dados
financeiros do workspace compartilhado. A remoção do link de e-mail no convite (decisão
de M2-02, "e-mail de convite sem link") fechou o vetor de phishing por link, mas não
resolve o problema de identidade que o spec citava como motivo original da regra.

---

### 2. Export CSV (LGPD) perde a conta de destino em transferências

**Severidade:** Média
**Arquivo:** `apps/backend/src/infra/db/repositories/transaction.repository.ts:208-230`
(`listForExport`) e `apps/backend/src/domain/services/transactions-csv.ts` (sem coluna
de destino)

**Descrição:** `listForExport` faz `leftJoin(bankAccounts, eq(transactions.accountId, ...))`
mas nunca junta/seleciona `transactions.toAccountId` (existe no schema,
`packages/db/src/schema/transaction.ts:49`, campo específico de `method = transfer`). O
CSV (`buildTransactionsCsv`) só tem uma coluna "Conta", preenchida com a conta de
**origem** — para uma transferência entre contas, a conta de destino simplesmente não
aparece em lugar nenhum da linha exportada. Não há teste cobrindo uma linha de
transferência no export (`export-transactions-csv.test.ts` só testa criação/soft-delete/
workspace vazio).

**Por que importa:** é exatamente o tipo de "campo truncado" que a tarefa de auditoria
pediu pra checar — o usuário que exporta os dados pra portabilidade LGPD, ao olhar uma
linha `method: Transferência`, não consegue saber pra qual conta o dinheiro foi. Não é
uma perda de dado no banco (a informação existe em `to_account_id`), só no artefato de
export.

---

### 3. `bun run typecheck` nunca checa o mobile — CI roda o mesmo comando

**Severidade:** Média (gap de processo/tooling, não de código em si — hoje o mobile está
de fato limpo)
**Arquivo:** `apps/mobile/package.json` (seção `scripts`, sem entrada `"typecheck"`);
`.github/workflows/*.yml` (step "Typecheck (turbo)" roda `bun run typecheck`)

**Descrição:** `bun run typecheck` na raiz é `turbo typecheck`. Rodei e confirmei: "Packages
in scope" lista `mobile`, mas só 6 tasks rodam (`@finance/backend`, `db`, `email`, `queues`,
`shared`, `storage`) — turbo pula silenciosamente qualquer workspace sem o script
`typecheck` no `package.json`, e o mobile não tem esse script (só tem `start`,
`reset-project`, `android`, `ios`, `web`, `lint`). O workflow de CI (`.github/workflows/`)
roda exatamente `bun run typecheck`, então **o mobile nunca foi typechecked em CI, em
nenhum push do M2**. Rodei manualmente `bunx tsc --noEmit` dentro de `apps/mobile` — hoje
está limpo, zero erros — mas isso só foi confirmado porque eu rodei à mão; várias tasks
(`m2-02`, `m2-08`, `m2-12`) citam "typecheck do mobile limpo"/"`bunx tsc --noEmit`" como
evidência de validação, sempre um comando manual, nunca o `bun run typecheck` que a CI de
fato roda.
**Por que importa:** o spec fecha "CI: rodar `bun test` + typecheck em todo push" como
requisito não-funcional. Hoje esse requisito só é cumprido pra metade do monorepo — uma
regressão de tipos introduzida no app não quebraria o CI, só seria pega se alguém lembrar
de rodar `tsc` manualmente (como as tasks documentam terem feito, mas sem automação).

---

### 4. Tela de vínculo do WhatsApp promete suporte a grupo que não existe

**Severidade:** Baixa (inconsistência de texto/UX, não de funcionalidade)
**Arquivo:** `apps/mobile/src/app/(app)/whatsapp-link.tsx:164-166`

**Descrição:** o texto de introdução da tela diz: "Vincule seu WhatsApp pra registrar
transações por lá, **em conversa privada ou num grupo compartilhado**." Conferido: não
existe nenhum código de vínculo/leitura de grupo (webhook só extrai `message.from`
individual, sem `wa_chat_id`; tabela `whatsapp_links` existe no schema mas não é lida/
escrita em lugar nenhum do código-fonte) — o vínculo de grupo está genuinamente bloqueado
esperando status OBA da Meta, exatamente como `tasks/backlog/m2-06b-whatsapp-grupo-workspace.md`
documenta (não é um "meio-implementado" inconsistente, é ausência total de código de
grupo — a pergunta 2 do escopo desta auditoria está respondida: a situação real bate com
o backlog).
**Por que importa:** o texto da tela cria uma expectativa que o produto não entrega hoje
— um usuário que adiciona o bot a um grupo de família esperando que funcione (por causa
dessa frase) vai ter uma experiência quebrada sem aviso nenhum na hora.

## Verificado e está ok

- **Papéis e enforcement (`requireWorkspaceRole`)**: todas as ~40 rotas de domínio
  (bank/account/card/category/transaction/recurring/workspace/summary) chamam
  `requireWorkspaceRole` com o `minRole` certo — `viewer` só em listagens, `member` em
  criar/editar transação e confirmar ocorrência, `admin` em CRUD de cadastro e gestão de
  membros/convites. `roleAtLeast` (`owner > admin > member > viewer`) está correto.
  Regra de sucessão de owner (não pode sair/ser rebaixado sendo o único) implementada
  tanto em `remove-member.ts` quanto em `update-member-role.ts`, com `countOwners`
  reforçado no service.
- **Seletor de workspace**: `useSession().switchWorkspace()` persiste em
  `expo-secure-store` e as telas usam `workspaceId` nas `queryKey` do TanStack Query
  (`['accounts', workspaceId]`, `['summary', workspaceId, ...]`, etc.) — trocar de
  workspace refaz o fetch automaticamente, sem precisar de `invalidateQueries` manual.
  Alcançável via pill no Resumo e NavRow "Workspaces" na aba Contas.
- **Tela de atividade (AuditLog)**: `GET /workspaces/:id/activity` (guard `viewer`) +
  tela `/workspaces/[id]/activity`, alcançável a partir de `/workspaces` (card por
  workspace, junto de "Membros"). `userName: null` quando o autor foi excluído.
- **Convites por telefone**: o gap documentado no M2-02 ("convite por telefone não
  resolve usuário até M2-05 popular `users.phone`") está de fato fechado — `listMyInvites`
  já casa por `[user.email, ...user.phone]` e `acceptInvite` aceita match por telefone.
- **Convite reachability**: "Convites recebidos" na aba Contas só aparece quando há
  convite pendente de verdade (`myInvites.length > 0`) — o gap de navegação achado na
  auditoria anterior (só alcançável por notificação) está corrigido.
- **Vínculo do WhatsApp por OTP**: `startWhatsAppLink`/`confirmWhatsAppLink`/
  `revokeWhatsAppLink` batem com o spec — código de 6 dígitos, hash, TTL 5min, rate limit
  3/15min por conta e por telefone (checado *antes* do lookup por hash), telefone já
  vinculado a outro usuário é rejeitado. Tela `/whatsapp-link` cobre gerar/copiar/abrir
  WhatsApp/verificar/revogar, alcançável por NavRow "WhatsApp" e card em `/profile`.
- **Webhook WhatsApp**: responde rápido (`set.status = 200` antes do `dispatch`, nunca
  `await` no `dispatch`), valida assinatura HMAC com `timingSafeEqual`, só processa
  mensagens de texto/imagem via job assíncrono — nenhum processamento de IA acontece no
  caminho síncrono do HTTP.
- **Vínculo de grupo**: confirmado que é ausência real de implementação (não parcial) —
  ver gap #4 acima pra ressalva sobre o texto da tela, mas o *backend* está corretamente
  descrito como bloqueado, sem código morto tentando fazer algo pela metade.
- **Pipeline de IA em 3 camadas**: Camada 0 (`parseObviousTransaction`, exige conta/
  cartão inequívoco + cache de categorização) → Camada 1 (`routeChatbotMessage`,
  roteador + structured output via `zodResponseFormat`) → Camada 2 (`answerAnalyticalQuestion`,
  loop de tool use com `MAX_TURNS = 4`, tools só devolvem números agregados via SQL,
  nunca listas). Guardrail de custo **de fato no caminho de execução**: `handleInboundWhatsAppMessage`
  checa `tokenBudget.isOverBudget(user.id)` *antes* de chamar `routeChatbotMessage`, e
  cai pro fallback determinístico tanto nesse caso quanto em qualquer exceção da chamada
  de IA (`catch` ao redor de `routeChatbotMessage`). `createRedisTokenBudget` está
  de fato instanciado em `main/composition.ts` e `main/worker.ts` (não só nos testes).
- **BullMQ / worker**: `main/worker.ts` monta todas as deps que os handlers precisam
  (`whatsapp.inbound-message` usa `repos`/`uow`/`rateLimiter`/`tokens`/`tokenBudget`),
  roda o sweep diário no boot + a cada 24h via `setInterval`, sem cron duplicado. Nenhuma
  chamada de IA (`getAiClient`) acontece fora de `handle-inbound-message.ts`, que só é
  invocada pelo job handler — nenhum "TODO: mover pra fila" nem processamento síncrono
  de IA na rota HTTP.
- **Auto-lançamento de recorrências**: `sweepRecurringAutoLaunch` lança sozinho e só
  notifica quando o lançamento deu certo; a confirmação manual antiga continua existindo
  como fallback inofensivo do intervalo entre a criação e o próximo sweep, sem duplicar
  (checado por `confirmedOccurrenceKeys` + `findByRecurringAndDate`).
- **Notificações push**: `registerForPushNotifications`/`unregisterCurrentPushToken`
  chamados em login/boot/logout (`session.tsx`); preferências (`createNotification`)
  checam `notificationPreference.isEnabled` antes de criar in-app **e** antes de
  despachar push — desabilitar um tipo é tudo-ou-nada como o spec pede. Tela
  `/notification-settings` com switch por tipo, ligada a `PATCH /notification-preferences/:type`.
  Import dinâmico de `expo-notifications` evita quebrar o Expo Go no Android (guard
  documentado e coerente).
- **Export CSV — resto do escopo**: rota `GET /workspaces/:id/export.csv` exige
  `admin`/`owner`; botão em `/workspaces/[id]/members` (mesma tela onde já vive gestão de
  papel); CSV escapa RFC 4180 corretamente (aspas/vírgula/quebra de linha), converte
  centavos pra reais, traduz tipo/método/origem. Única lacuna real é a de destino de
  transferência (gap #2).
- **Biometria**: `expo-local-authentication` + `BiometricLockProvider` trava no cold
  start e ao voltar do background após 2min; toggle em `/profile` só aparece quando
  `hasHardwareAsync()`; preferência persistida em `expo-secure-store`
  (`biometricStore.getEnabled/setEnabled`). Fica dentro do guard de sessão (`(app)/_layout.tsx`),
  não substitui login — bate com o spec.
- **Testes e typecheck**: `bun --cwd=apps/backend test` → **146/146 passando**; `bun run
  typecheck` limpo nos 6 packages que o rodam (ver gap #3 sobre o mobile ficar de fora).
- **TODO/FIXME/stub**: busca em `apps/backend/src` e `apps/mobile/src` não encontrou
  nenhum TODO/FIXME/stub pendente dentro do escopo do M2 (fora de transfer/split/
  attachment) — os únicos comentários com "TODO" encontrados são prosa comum ("todos os
  workspaces", "todos os cartões") ou uma nota de refactor pré-existente e não-M2 em
  `apps/mobile/src/lib/schemas/auth.ts` ("mover pra packages/shared").

## Resumo

4 gaps reais, nenhum "inventado": (1) **alta** — `accept-invite.ts` não checa
`emailVerifiedAt`, contrariando regra de segurança explícita do spec e permitindo que
alguém com um e-mail digitado errado (ou de terceiro), sem nunca provar posse da caixa de
entrada, aceite um convite de workspace e veja dados financeiros compartilhados; (2)
**média** — export CSV de transações perde a conta de destino em transferências,
comprometendo a portabilidade LGPD daquelas linhas; (3) **média** — `bun run typecheck`
(o mesmo comando que a CI roda) nunca checa o mobile, porque falta o script no
`package.json` — hoje o código está limpo, mas o gate não existe de verdade; (4) **baixa**
— o texto da tela de vínculo do WhatsApp promete grupo compartilhado, que está
genuinamente bloqueado (não implementado pela metade) esperando OBA da Meta. Todo o
resto do M2 — papéis/enforcement, seletor de workspace, atividade, OTP do WhatsApp,
pipeline de IA em camadas com guardrail de custo real, BullMQ/worker/auto-lançamento,
push, biometria — foi conferido linha a linha contra spec e código, e está correto.

## Ações tomadas (2026-07-19)

Gap #3 corrigido (mesma causa raiz do gap #3 de `m1-gaps-implementacao.md`):
adicionado script `"typecheck": "tsc --noEmit"` em `apps/mobile/package.json`.
