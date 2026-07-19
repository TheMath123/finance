# M3 — Auditoria de integridade pós-correção de segurança

**Data:** 2026-07-19
**Escopo:** verificação geral (não é auditoria de segurança) depois do commit
`3e9f1ea` ("fix: M3 - corrige gaps de seguranca detectados na auditoria"), que
corrigiu os achados #1–#5 e #8 de `tasks/m3-gaps-seguranca.md`. Objetivo:
confirmar que a correção não quebrou nem deixou nada incompleto em M3-01 a
M3-05.
**Método:** releitura de todo código tocado pelo fix (use-cases de
transfer/split, repositórios, rotas HTTP), busca por todos os callers dos
métodos que mudaram assinatura (`accept`/`reject`/`updateStatus`/`cancel`),
execução real da suíte de testes e do typecheck do monorepo, conferência da
integração mobile (telas, nav, componentes de anexo/split).

## Gaps

### 1. [Baixo/Informativo] `bun run typecheck` na raiz não checa de fato o pacote `mobile`

**Arquivo:** `apps/mobile/package.json` (sem script `"typecheck"`), `turbo.json:8-10`

O `turbo.json` declara a task `typecheck` com `dependsOn: ["^typecheck"]`, mas
o `package.json` do app mobile não tem um script `typecheck` — o Turborepo
simplesmente pula o pacote sem erro nem aviso. Rodando `bun run typecheck` na
raiz, a saída mostra "6 successful, 6 total" cobrindo `@finance/backend`,
`@finance/db`, `@finance/email`, `@finance/queues`, `@finance/shared`,
`@finance/storage` — `mobile` nunca aparece na lista de tasks executadas,
apesar de estar em "Packages in scope".

**Por que importa:** quem roda o comando (inclusive esta auditoria, antes de
eu notar) pode achar que o mobile foi type-checked quando na verdade não foi.
Isso não é uma regressão do fix de segurança — o script já não existia desde
o scaffold original do app (M2), confirmado via `git log` em
`apps/mobile/package.json`. Rodei `bunx tsc --noEmit` manualmente dentro de
`apps/mobile` e o resultado veio limpo (0 erros), então não há erro de tipo
real hoje — é uma lacuna de cobertura do comando, não um bug de código.

### 2. [Baixo] Mutations de aceitar/recusar/confirmar/marcar-pago não têm `onError` — corrida bloqueada (comportamento agora correto) fica muda pro usuário

**Arquivos:** `apps/mobile/src/app/(app)/transfers/index.tsx:38-45`,
`apps/mobile/src/app/(app)/splits.tsx:22-25,50-56`

Os `useMutation` de `accept`/`reject` (transfers) e `markPaid`/`confirm`
(splits) só definem `onSuccess` (invalidação de query) — nenhum tem `onError`.
Isso é um padrão pré-existente (não alterado pelo fix), mas o fix muda o que
acontece quando o backend rejeita: antes, um duplo-toque em "Confirmar
recebimento" ou "Aceitar" tinha uma chance real de as duas requisições
passarem e criar duas transações (o próprio achado #1/#2 da auditoria de
segurança); agora a segunda chamada recebe corretamente `already_finalized`/
`invalid_transition`, só que a UI não mostra nada — o botão só para de
carregar (`loading: mutation.isPending` volta a `false`) sem nenhum toast/alert
explicando por quê. Antes o bug mascarava a ausência de feedback (a ação
"funcionava" mesmo duplicada); agora o comportamento correto do backend fica
silencioso no app. Vale considerar (fora do escopo desta auditoria, é decisão
de produto) adicionar um toast genérico de erro nessas mutations.

### 3. [Baixo/Informativo] Rate limit de `split-confirm` (30/hora por criador) pode apertar em um cenário de viagem em grupo com muitas despesas

**Arquivo:** `apps/backend/src/application/use-cases/split/confirm-reimbursement.ts:28`

A confirmação é por **share**, não por split, e não existe ação de "confirmar
todos de uma vez" na UI (`apps/mobile/src/app/(app)/splits.tsx:70-72` — um
botão por card). Num cenário plausível pós-viagem — 20 despesas divididas
entre 3 participantes cada = até 60 shares — o criador confirmando um por um
bateria no limite de 30/hora na trigésima primeira confirmação da mesma
sessão e precisaria esperar a janela deslizante liberar. Não encontrei essa
funcionalidade de confirmação em lote mencionada em `tasks/done/m3-03-split-despesas.md`,
então isso não é uma regressão de spec — é só um ponto de atenção de UX que o
roteiro desta auditoria pediu pra avaliar. Os demais limites (20/hora em
`transfer-accept`/`transfer-reject`, 30/hora em `split-mark-paid`/
`split-cancel`, 10+30/hora em `transfer-create`) não têm um fluxo real
plausível de uso legítimo que os atinja — são ações que um usuário comum faz
poucas vezes por hora.

Nenhum dos três itens acima é uma regressão funcional causada pelo fix de
segurança em si (a lógica de negócio do fix está correta — ver seção
seguinte); são lacunas de cobertura/UX adjacentes que a auditoria pediu pra
avaliar.

## Verificado e está ok

- **`accept-transfer.ts`, `reject-transfer.ts`, `create-transfer.ts`**: lógica
  de negócio original (contato confiável, notificações, expiração,
  auto-aceite) intacta. O `UPDATE` condicional em `accept()`/`reject()`
  (`inter-user-transfer.repository.ts:18-36`, `WHERE status='pending'`) e o
  `throw new AlreadyFinalizedError()` dentro de `uow.run` revertem
  corretamente a transação de entrada já criada quando a corrida é perdida —
  confirmado lendo o fluxo completo e pelo teste
  `transfer.test.ts:238-270` (`Promise.all` de dois `accept` reais contra
  Postgres, só um vence, saldo final consistente).
- **`confirm-reimbursement.ts`, `mark-share-paid.ts`, `cancel-split.ts`**:
  mesma verificação — `updateStatus`/`cancel` condicionais
  (`split-share.repository.ts:14-24`, `expense-split.repository.ts:18-27`),
  reembolso revertido via `AlreadyFinalizedError` quando perde a corrida.
  Teste `split.test.ts:267-291` cobre duas chamadas paralelas de `confirm`.
- **Todos os callers dos métodos que agora retornam `| undefined`**: busquei
  `interUserTransfer.accept/reject`, `splitShare.updateStatus` e
  `expenseSplit.cancel` em todo `apps/backend/src` (não só nos arquivos que a
  correção editou) — os únicos callers são as quatro use-cases acima. Não há
  fake/in-memory repository desses ports (só existem in-memory pra
  rate-limiter, cache, token-budget e storage) nem outro teste ou worker
  chamando esses métodos diretamente; `notification/sweep.ts` só usa
  `listExpired`/`markExpired` (métodos não tocados pelo fix). Todos os quatro
  callers tratam `undefined` corretamente (`if (!result) throw
  AlreadyFinalizedError()` / `if (!updated) return left(...)`).
- **Mapeamento de erros HTTP**: `SPLIT_ERRORS` e `TRANSFER_ERRORS` cobrem
  `rate_limited`, `invalid_transition`, `already_finalized` com status/mensagem
  corretos; `not_creator`/`not_participant`/`not_recipient` continuam
  compartilhando código `not_found` com os respectivos "não existe" (sem
  oráculo de IDOR), consistente com o que a auditoria de segurança já havia
  verificado.
- **Wiring do rate limiter**: `RedisRateLimiter` (produção,
  `redis-rate-limiter.ts`, janela deslizante via sorted set) e
  `InMemoryRateLimiter` (testes) implementam a mesma interface `RateLimiter` e
  estão corretamente injetados em `AppDeps`/`createTestDeps`; as 5 rotas
  monetárias + o novo limite por destinatário em `createTransfer` chamam
  `deps.rateLimiter.isLimited` com as chaves e janelas esperadas.
- **Suíte de testes**: `bun --cwd=apps/backend test` → **146 pass, 0 fail**
  (397 `expect()`, 19 arquivos, 48.3s). Nenhuma regressão.
- **Typecheck**: `bun run typecheck` na raiz → limpo em
  `@finance/backend`, `@finance/db`, `@finance/email`, `@finance/queues`,
  `@finance/shared`, `@finance/storage` (todos cache hit, todos com sucesso).
  Mobile não é coberto pelo comando (ver gap #1), mas `tsc --noEmit` manual
  dentro de `apps/mobile` também veio limpo.
- **Integração mobile do M3**: `/transfers` (`transfers/index.tsx`),
  `/transfers/new` (`transfers/new.tsx`), `/trusted-contacts`
  (`trusted-contacts.tsx`) e `/splits` (`splits.tsx`) existem e são
  alcançáveis via `router.push` a partir de nav rows reais em
  `apps/mobile/src/app/(app)/(tabs)/accounts.tsx:187-212` (envio de
  transferência sempre visível; pendentes/contatos/splits condicionados a
  haver algo pra mostrar, como já era o desenho original de M3-02/03).
  `create-split-form.tsx` e `attachment-field.tsx` continuam importados e
  renderizados dentro de `edit-transaction-form.tsx` (linhas 18-19, 64, 79).
- **Nenhum TODO/FIXME/XXX/HACK novo**: busca no diff do commit `3e9f1ea` e nos
  arquivos de use-case/repositório/whatsapp tocados não encontrou nenhum
  marcador desse tipo.
- **Nenhuma migração de schema necessária**: o fix só mudou a cláusula `WHERE`
  de `UPDATE`s existentes — nenhum arquivo em `packages/db` foi tocado no
  commit de correção.
- **Blocker externo do R2 (M3-01/04/05 em `in-progress`)**: confirmado que
  segue sendo o único motivo dessas três tasks não estarem em `done` — não é
  um gap novo, é o bloqueio já documentado (bucket real do Cloudflare R2 ainda
  não criado).

## Resumo

Rode a suíte (146/146) e o typecheck (limpo em todos os pacotes cobertos) —
o fix de segurança não quebrou nada. Reli accept/reject/create-transfer e
confirm/mark-paid/cancel-split linha a linha: a lógica de negócio original
(contato confiável, notificações, validações) segue correta, e o padrão
`UPDATE` condicional + rollback via `uow.run`/`throw` fecha as corridas sem
efeito colateral. Busquei todos os callers dos métodos que passaram a
retornar `undefined` em todo o backend (não só os arquivos editados) — só as
quatro use-cases os chamam, e todas tratam o `undefined` certo. Telas e
componentes mobile do M3 continuam existindo e conectados. Três achados
menores, nenhum é regressão do fix: (1) `bun run typecheck` na raiz pula o
mobile silenciosamente por falta de script (pré-existente, `tsc` manual passa
limpo); (2) mutations de accept/reject/confirm/mark-paid no app não têm
`onError`, então a rejeição agora correta de uma corrida fica muda pro
usuário; (3) o limite de 30/hora em `split-confirm` pode apertar num cenário
de confirmar dezenas de shares após uma viagem em grupo, já que não há
confirmação em lote. Nenhum TODO/FIXME novo, nenhuma migração pendente.

## Ações tomadas (2026-07-19)

Achado #1 corrigido: adicionado script `"typecheck"` em `apps/mobile/package.json`
(mesma correção aplicada nos relatórios de M1/M2 — causa raiz compartilhada).
