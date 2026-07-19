## Ações tomadas (2026-07-19, mesmo dia)

- **#1 [Alto, corrigido]** — `accept()`/`reject()` (`inter-user-transfer.repository.ts`)
  viraram `UPDATE` condicional (`WHERE status='pending'`), retornando
  `undefined` se outra chamada já venceu a corrida. `acceptTransfer` agora
  reverte a transação de entrada já criada (`AlreadyFinalizedError` +
  `throw` dentro do `uow.run`, que faz rollback) quando isso acontece.
  Teste novo (`transfer.test.ts`) dispara duas chamadas de `accept` em
  paralelo de verdade (`Promise.all` contra Postgres real) e confirma que
  só uma vence.
- **#2 [Médio, corrigido]** — mesmo padrão aplicado em
  `updateStatus` (`split-share.repository.ts`, agora exige `fromStatus`) e
  `cancel` (`expense-split.repository.ts`, condicional em
  `cancelled_at IS NULL`). `confirmShareReimbursement` também reverte o
  reembolso já criado se perder a corrida. Teste novo (`split.test.ts`)
  com duas chamadas paralelas de `confirm`.
- **#3 [Médio, corrigido]** — rate limit próprio somado nas 5 rotas
  (`transfer-accept`, `transfer-reject`, `split-confirm`,
  `split-mark-paid`, `split-cancel`), em vez da mudança arquitetural mais
  ampla (mover o limite geral pra dentro de `requireAuthenticated`, que
  afetaria toda rota autenticada do backend, não só as do M3).
- **#4 [Médio, corrigido]** — `upload-attachment.ts` (rota) agora rejeita
  pelo header `Content-Length` antes de chamar `request.formData()`.
- **#5 [Médio, corrigido]** — `createTransfer` ganhou um segundo rate
  limit chaveado no destinatário (`transfer-create:to:${recipient.id}`,
  30/hora), além do já existente por remetente.
- **#6 [Baixo/informativo]** — nenhuma ação (o próprio achado concluiu que
  não há problema de segurança real).
- **#7 [Informativo, mitigado]** — nenhuma ação (mitigação de defesa em
  profundidade era opcional pro conteúdo declarado vs. real; mantido só
  como nota).
- **#8 [Informativo, mitigado por precaução]** — `downloadMedia`
  (`meta-cloud-api.ts`) agora valida que o host da URL devolvida pela
  Meta termina em `.facebook.com`/`.fbcdn.net`/`.whatsapp.net` antes do
  segundo `fetch` (defesa em profundidade, não havia caminho de
  exploração identificado).

**Resultado:** 146/146 testes passando (144 + 2 novos cobrindo as
corridas corrigidas), typecheck limpo em todos os pacotes.

---

# M3 — Auditoria de segurança independente (camada social + anexo de comprovante)

**Data:** 2026-07-19
**Escopo:** commits `ef4bd3b..e1b82aa` (M3-01 a M3-05) — transferência entre
usuários, split de despesas, anexo de comprovante (app + WhatsApp), storage
S3-compatible novo.
**Método:** leitura de código (use-cases, rotas HTTP, repositórios, guards),
sem execução. Não é uma correção — só levantamento de achados pra alguém
(humano) decidir o que vira task.

## Achados

### 1. [Alto] Race condition (check-then-act) no aceite/recusa de transferência — pode gerar crédito duplicado

**Arquivos:**
- `apps/backend/src/application/use-cases/transfer/accept-transfer.ts:25-61`
- `apps/backend/src/application/use-cases/transfer/reject-transfer.ts:11-17`
- `apps/backend/src/infra/db/repositories/inter-user-transfer.repository.ts:18-34`

**Problema:** `acceptTransfer` lê a transferência (`findById`), confere
`status !== "pending"` **fora** de qualquer transação/lock, e só depois abre
`uow.run(...)` pra criar a transação de entrada e chamar
`repos.interUserTransfer.accept(transfer.id, toTx.id)`. O `UPDATE` em
`accept()` (repository, linha 18-26) é incondicional —
`.where(eq(interUserTransfers.id, id))`, sem `AND status = 'pending'` — e não
há `SELECT ... FOR UPDATE` em nenhum ponto. `reject()` (linha 27-35) tem o
mesmo formato. `db.transaction()` no `unit-of-work.ts` não muda isso: o
isolamento padrão do Postgres (READ COMMITTED) não impede duas transações
concorrentes de lerem o mesmo `status = 'pending'` antes de qualquer uma
commitar.

**Cenário de exploração:** o destinatário dispara duas requisições
`POST /transfers/:id/accept` em paralelo (duas abas, dois dispositivos, ou um
script simples), cada uma com uma `accountId` diferente (ou a mesma). As
duas passam pela checagem `transfer.status !== "pending"` antes de qualquer
uma escrever no banco, então as duas criam uma transação de entrada (`income`)
e as duas chamam `accept()` — resultado: **duas transações de crédito reais**
para uma única transferência, e a linha final de `inter_user_transfers` fica
com só um `toTransactionId` (o da última escrita), órfão do outro. O mesmo
vale pra uma corrida `accept` + `reject` simultâneos: o `reject` pode
sobrescrever `status` pra `rejected` depois que o `accept` já criou e
creditou a transação de entrada — a UI do remetente mostraria "recusada" mas
o destinatário já teria o dinheiro creditado.

**Por que isso é plausível (não só teórico):** não há rate limit em nenhuma
das duas rotas (ver achado #3), então nada impede o cliente de disparar as
duas chamadas dentro da mesma janela de milissegundos. Não encontrei teste
cobrindo esse caso em `transfer.test.ts`.

**Mitigação sugerida:** tornar o `UPDATE` condicional e usar o resultado pra
decidir o `Either` — ex. `UPDATE ... SET status='accepted' ... WHERE id = ?
AND status = 'pending' RETURNING *`; se não retornar linha, tratar como
`already_finalized` (o que já é um erro mapeado). Isso serializa a decisão
no banco sem precisar de lock explícito. Aplicar o mesmo padrão em `reject()`.

---

### 2. [Médio] Mesmo padrão de check-then-act nas ações de split (menor raio de explosão)

**Arquivos:**
- `apps/backend/src/application/use-cases/split/confirm-reimbursement.ts:24-61`
- `apps/backend/src/application/use-cases/split/mark-share-paid.ts:11-21`
- `apps/backend/src/application/use-cases/split/cancel-split.ts:16-24`
- `apps/backend/src/infra/db/repositories/split-share.repository.ts:14-22` (`updateStatus`, `UPDATE` incondicional)
- `apps/backend/src/infra/db/repositories/expense-split.repository.ts:18-27` (`cancel`, idem)

**Problema:** mesma estrutura do achado #1 — leitura + checagem de status
fora de um `UPDATE` condicional. `confirmShareReimbursement` é o caso mais
sensível: duas chamadas paralelas de `POST /split-shares/:id/confirm` pelo
criador do split (ex.: duplo toque na UI, ou um retry de rede que na
verdade teve sucesso) podem ambas passar `share.status === "paid"` antes de
qualquer commit, e cada uma cria uma transação de reembolso — reembolso
duplicado na mesma conta.

**Diferença em relação ao achado #1:** aqui o ator é sempre o mesmo usuário
em ambos os lados da corrida (criador confirmando seu próprio split, ou
participante marcando seu próprio share) — não há um adversário de fato, o
gatilho mais realista é duplo-clique/retry de cliente, não um ataque
deliberado. Por isso severidade média, não alta.

**Mitigação sugerida:** mesmo padrão do achado #1 — `UPDATE ... WHERE id = ?
AND status = ?` condicional, tratando "0 linhas afetadas" como
`invalid_transition`.

---

### 3. [Médio] Nenhuma rota nova de ação monetária tem rate limit (além do limite geral, que elas nem usam)

**Arquivos:**
- `apps/backend/src/http/modules/transfer/routes/accept-transfer.ts:14`
- `apps/backend/src/http/modules/transfer/routes/reject-transfer.ts:14`
- `apps/backend/src/http/modules/split/routes/confirm-share.ts:14`
- `apps/backend/src/http/modules/split/routes/mark-share-paid.ts:14`
- `apps/backend/src/http/modules/split/routes/cancel-split.ts:14`
- `apps/backend/src/http/guards.ts:13-24` vs `30-57`

**Problema:** essas cinco rotas usam só `requireAuthenticated` (guards.ts:13),
que **não** aplica o limite geral de 300 req/min por usuário — esse limite
só existe dentro de `requireWorkspaceRole` (guards.ts:39-46), que essas rotas
não chamam (fazem sentido sem `workspaceId` na URL, já que a checagem de
dono é feita dentro da use-case). Resultado: nenhuma dessas cinco rotas tem
qualquer rate limit, nem o geral nem um específico.

**Isso é um padrão pré-existente, não introduzido pelo M3** — já valia pra
`delete-account`, `revoke-invite`, rotas de notificação, etc. (confirmado via
busca por `requireAuthenticated` em todo `http/modules`). O que muda no M3 é
que agora esse padrão se aplica a ações que **movem dinheiro** (aceitar
transferência, confirmar reembolso), e — mais importante — a ausência de
rate limit remove qualquer fricção natural contra a exploração do achado #1
(a corrida fica trivial de disparar sem nenhum bloqueio no meio do caminho).

**Mitigação sugerida:** não necessariamente adicionar rate limit a essas
rotas especificamente (o gap é arquitetural, mais amplo que o M3) — mas vale
avaliar mover o limite geral de 300/min pra dentro de `requireAuthenticated`
em vez de só `requireWorkspaceRole`, já que hoje qualquer rota que não passe
`workspaceId` na URL fica de fora de qualquer limite.

---

### 4. [Médio] Upload de anexo: corpo inteiro vai pra memória antes de qualquer checagem de tamanho, sem limite de body no servidor

**Arquivos:**
- `apps/backend/src/http/modules/transaction/routes/upload-attachment.ts:19,25`
- `apps/backend/src/application/use-cases/attachment/upload-attachment.ts:31`
- `apps/backend/src/main/index.ts:8` (`createApp(deps).listen(env.PORT)`, sem config de limite)

**Problema:** a rota chama `await request.formData()` e depois
`await file.arrayBuffer()` (linha 19 e 25) **antes** de chamar a use-case —
o corpo inteiro do multipart já está carregado em memória nesse ponto. Só
dentro de `uploadAttachment` (linha 31) é que `input.size >
MAX_ATTACHMENT_SIZE_BYTES` (5MB) é checado, quando o custo de memória já foi
pago. Não encontrei nenhuma configuração de limite de tamanho de request em
`main/index.ts`, `main/app.ts` ou na criação do `Elysia()`/`Bun.serve` —
Elysia/Bun não impõem um limite por padrão.

**Cenário de exploração:** qualquer usuário autenticado com papel `member`
em um workspace (não precisa ser dono) pode mandar um `POST
/workspaces/:workspaceId/transactions/:transactionId/attachment` com um
corpo multipart de vários GB. Cada requisição concorrente desse tipo aloca
memória proporcional ao tamanho enviado — um punhado de uploads grandes em
paralelo é o suficiente pra pressionar/derrubar o processo por OOM, sem
precisar de volume alto de requisições (diferente de um DoS clássico de
muitas requisições pequenas).

**Mitigação sugerida:** configurar um limite de tamanho de corpo na camada
HTTP (ex. opção nativa do `Bun.serve`/Elysia, ou checagem do header
`Content-Length` antes de consumir o stream) num valor pouco acima de 5MB,
antes de chamar `request.formData()`.

---

### 5. [Médio] Rate limit de `createTransfer` é só por remetente — um alvo específico pode ser inundado por múltiplas contas

**Arquivo:** `apps/backend/src/application/use-cases/transfer/create-transfer.ts:32`

**Problema:** a chave do rate limit é `transfer-create:${actor.userId}` —
10 transferências/hora por **remetente**, sem nenhum limite por
**destinatário**. Quem controla N contas na plataforma (cada uma dentro do
próprio limite de 10/hora) pode mirar o mesmo destinatário (telefone/e-mail
conhecido) com até `10×N` transferências por hora, sem que nenhum limite
individual seja violado.

**Cenário de exploração:** cada transferência não-auto-aceita gera uma
notificação (`transfer_pending`, in-app + push, `create-transfer.ts:115-121`)
pro destinatário e fica pendente na lista dele. Um atacante com várias contas
de teste (o quão fácil é criar múltiplas contas depende de controles de
cadastro fora do escopo desta auditoria — não verificados aqui) consegue
inundar a lista de "transferências pendentes" e a caixa de notificação de
uma vítima específica, sem barreira nenhuma do lado do destinatário. Custo
pro atacante: cada transferência debita de verdade uma conta dele mesmo (não
é dinheiro real de terceiros, é lançamento contábil no próprio workspace),
então o impacto é mais "assédio/spam de atenção" do que perda financeira
direta de terceiros.

**Mitigação sugerida:** somar um segundo rate limit chaveado no
destinatário (ex. `transfer-create:to:${recipient.id}`) além do já existente
por remetente.

---

### 6. [Baixo/Informativo] `amount` de transferência sem limite superior de negócio

**Arquivo:** `apps/backend/src/http/modules/transfer/schemas.ts:11`
(`z.number().int().positive()`), `packages/db/src/schema/transaction.ts:38`
(`bigint("amount", { mode: "number" })`)

**Análise:** não há teto explícito pro valor em centavos — dá pra mandar
`Number.MAX_SAFE_INTEGER` (≈ 9×10^15, ou ≈ R$ 90 trilhões). Verificado que
isso **não** causa overflow: a coluna é `bigint` no Postgres (limite
≈9.2×10^18), e `Number.MAX_SAFE_INTEGER` é o próprio limite de precisão
segura de um `number` do JS, então nenhum valor aceito pelo schema Zod
ultrapassa a faixa segura. Também não há verificação de saldo da conta em
nenhum lugar do fluxo de transferência (nem em transações comuns do M1,
pelo que dá pra ver) — este parece ser, por design, um app de registro
contábil (permite saldo negativo), não um ledger com movimentação real de
dinheiro de terceiros; então um valor absurdo só produz um número estranho
nos relatórios do próprio usuário, sem consequência de segurança. Achado
mantido como informativo por ser exatamente o que o roteiro de auditoria
pedia pra investigar, mas não seria listado como problema de segurança de
verdade sem mais contexto de produto.

---

### 7. [Informativo] Nenhuma validação de magic bytes do conteúdo do arquivo — mitigado hoje pelo consumo exclusivo via `<Image>` do React Native

**Arquivos:**
- `apps/backend/src/application/use-cases/attachment/upload-attachment.ts:10-14,29-31`
- `apps/backend/src/application/use-cases/whatsapp/handle-inbound-image.ts:51-56`

**Análise:** o `contentType` (vindo de `file.type` no app, ou de
`mime_type` da Meta no WhatsApp) só é validado contra a allowlist
`ALLOWED_CONTENT_TYPES` (`jpg`/`png`/`webp`) — nunca contra os bytes reais
do arquivo. Dá pra subir um arquivo cujo conteúdo não é realmente uma imagem
válida, só com o header declarado batendo com um dos três tipos aceitos.
**Não é um problema explorável hoje**: o `ContentType` gravado no S3
(`s3-storage.ts:34`) é sempre um dos três valores da allowlist (o código só
chega em `deps.storage.upload` depois que `ALLOWED_CONTENT_TYPES[input.
contentType]` já resolveu com sucesso — nunca é possível gravar
`text/html`/`image/svg+xml` como `ContentType`), e o único consumidor atual
da URL assinada é o componente `<Image>` do React Native no app mobile, que
não interpreta HTML/JS. Se um cliente web (ex. dashboard M4, mencionado
como próximo milestone na spec) vier a renderizar essas URLs diretamente
num `<img>`/link de navegador, vale reconsiderar — mas hoje não há
caminho de exploração.

---

### 8. [Informativo] `downloadMedia`/`fetchMediaUrl` do WhatsApp fazem `fetch()` sem allowlist de host — superfície real é confiar na Meta, não SSRF de usuário

**Arquivo:** `apps/backend/src/infra/whatsapp/meta-cloud-api.ts:41-61`

**Análise:** `fetchMediaUrl` monta a URL com host fixo
(`https://graph.facebook.com/...`) e só interpola `mediaId` no path — o
`mediaId` vem de `message.image.id` no payload do webhook, que só chega até
aqui depois de passar por `verifyWebhookSignature` (HMAC-SHA256 com
`WHATSAPP_APP_SECRET`, comparação `timingSafeEqual`) — ou seja, um atacante
externo não consegue forjar esse campo sem o segredo do app. Interpolar
`mediaId` no path não muda o host de destino do `fetch`, então não há SSRF
por aí mesmo em tese.

`downloadMedia(url)` já é diferente: o `url` vem da **resposta** da Meta
(`data.url` em `fetchMediaUrl`), não é validado contra nenhuma allowlist de
host antes do segundo `fetch()` — e esse segundo fetch manda o
`WHATSAPP_ACCESS_TOKEN` de verdade no header `Authorization`. Isso só vira
SSRF/exfiltração de token se a própria API da Meta for comprometida ou se
houver um MITM quebrando TLS — fora do modelo de ameaça usual pra uma
integração de terceiro confiável. Ainda assim, como mitigação de baixo custo
(defesa em profundidade, não porque haja um caminho de exploração
identificado), validar que o host da URL devolvida termina em
`.facebook.com`/`.fbcdn.net` antes do segundo `fetch` reduziria o raio de
explosão caso essa suposição de confiança um dia se prove errada.

## Verificado e não é um problema

- **IDOR em `accept`/`reject` de transferência:** `not_recipient` e
  `transfer_not_found` devolvem o mesmo `404`/`not_found` genérico
  (`apps/backend/src/http/modules/transfer/errors.ts:30-40`) — não existe
  oráculo pra diferenciar "transferência não existe" de "existe mas não é
  sua". Mesma coisa pro split: `not_creator`/`split_not_found` e
  `not_participant`/`share_not_found` compartilham código/mensagem
  (`apps/backend/src/http/modules/split/errors.ts:30-46`). IDs são UUID v4,
  não enumeráveis por sequência.

- **`account.repository.findById` sem escopo de workspace:** usado em dois
  lugares. Em `accept-transfer.ts:30-33`, o resultado é sempre validado
  logo depois via `getMemberRole(account.workspaceId, actor.userId)` antes
  de qualquer uso — se o `role` não existir, retorna `account_not_found`.
  Em `create-transfer.ts:52`, o `trust.defaultAccountId` usado no
  `findById` só pode ter sido setado por `trustedContact.upsert`
  (`trusted-contact.repository.ts:14-25`), que só é chamado a partir de
  `accept-transfer.ts:57-58` — sempre com uma `account.id` que **já passou**
  pela validação de `getMemberRole` no mesmo fluxo. Não existe rota que
  deixe um usuário setar `defaultAccountId` livremente (a única escrita é
  esse `upsert` dentro do aceite). Confirmado: nenhum caminho usa esse
  `findById` sem uma verificação de posse anterior.

- **`transaction.repository.findById` sem escopo de workspace:** usado só em
  `confirm-reimbursement.ts:34`, com `split.transactionId` — e o acesso ao
  `split` já foi gated por `split.createdBy !== actor.userId` na linha 29.
  O `transactionId` não é input do usuário, vem do registro do split que já
  foi confirmado como do ator. Seguro.

- **Path traversal na `key` do S3 (`upload-attachment.ts:41`):** a
  extensão (`ext`) só pode vir de `ALLOWED_CONTENT_TYPES`, um mapa fixo com
  3 entradas (`jpg`/`png`/`webp`) — nunca do nome de arquivo enviado pelo
  cliente. `workspaceId`/`transactionId` são UUIDs validados por schema Zod
  antes de chegar na use-case. Não há como injetar `../` ou caracteres
  especiais na key.

- **Participante externo do split (`participant_name` livre):** armazenado
  como string livre e interpolado em `title`/`body` de notificação
  (`confirm-reimbursement.ts:46`, `create-split.ts:95`). Confirmado (busca
  em `apps/mobile/src`) que não há `dangerouslySetInnerHTML`, `WebView` nem
  renderização de HTML em lugar nenhum do app — tudo passa por
  `ThemedText`/componentes RN puros, que não interpretam markup. Sem risco
  de XSS/injeção nesse texto hoje.

- **Env eager no boot (`main/env.ts`):** `envSchema.parse(process.env)`
  lança `ZodError` se faltar `STORAGE_*`. Mensagens de erro do Zod pros
  campos usados aqui (`z.string().min(1)`, etc.) descrevem a regra violada
  ("String must contain at least 1 character(s)"), não ecoam o valor
  submetido. Nenhum `console.log`/log de erro de boot encontrado que
  imprima valor de env. `.env.example` (raiz e `packages/storage/`) só tem
  placeholders vazios ou genéricos, nenhum segredo real commitado.

- **SQL raw:** toda query passa por Drizzle (`eq`, `and`, `or`, etc.); os
  poucos usos de `sql\`...\`` encontrados (ex.
  `transaction.repository.ts:102-109` no `balanceDelta`, agregações em
  `monthlyTotals`/`expenseByCategory`) interpolam apenas nomes de
  coluna/comparações fixas do próprio código, nunca uma variável vinda de
  input do usuário sem passar pelos parâmetros do Drizzle. Nenhuma
  concatenação de string de usuário em SQL encontrada nos arquivos do M3.

- **Segredos hardcoded / `console.log` de dado sensível:** nenhum
  `console.log`/`console.error`/`console.warn` encontrado em
  `apps/backend/src` fora de arquivos de teste. Nenhum token, senha ou
  segredo hardcoded nos arquivos novos do M3.

- **Assinatura do webhook do WhatsApp:** `verifyWebhookSignature`
  (`meta-cloud-api.ts:108-118`) usa `timingSafeEqual` (constante no tempo,
  evita timing attack) e compara contra o **corpo cru** (`request.text()`
  antes de `JSON.parse`), não o objeto já parseado — evita o problema
  clássico de HMAC quebrar por diferença de serialização. Corretamente
  implementado.
