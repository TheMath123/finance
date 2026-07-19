# Auditoria de segurança independente — race conditions em lógica financeira (backend inteiro)

**Data:** 2026-07-19
**Escopo:** todo `apps/backend/src`, fora do que já foi encontrado/corrigido em
`tasks/m3-gaps-seguranca.md` (transferência entre usuários, split de
despesas — `accept-transfer.ts`, `reject-transfer.ts`,
`confirm-reimbursement.ts`, `mark-share-paid.ts`, `cancel-split.ts`).
**Foco:** correção de lógica financeira e race conditions do tipo
check-then-act (leitura de estado + decisão + `UPDATE`/`INSERT` sem proteção
atômica).
**Método:** leitura de código (use-cases, repositórios, schema Drizzle),
sem execução. Não é uma correção — só levantamento de achados.

## Achados

### 1. [Alto] Pagamento de fatura — `UPDATE` incondicional em `markPaid`, mesmo padrão do achado #1 do M3

**Arquivos:**
- `apps/backend/src/application/use-cases/card/pay-invoice.ts:23-72`
- `apps/backend/src/infra/db/repositories/invoice.repository.ts:50-58` (`markPaid`)

**Problema:** `payInvoice` lê a fatura (`findInWorkspace`), confere
`invoice.status === "paid"` (linha 25) **fora** de qualquer transação, e só
depois abre `uow.run(...)` pra criar a transação de despesa e chamar
`repos.invoice.markPaid(invoiceId, payment.id)`. O `UPDATE` em `markPaid`
(repo, linha 50-58) é incondicional — `.where(eq(cardInvoices.id, invoiceId))`,
sem `AND status <> 'paid'`. Exatamente a mesma estrutura do achado #1 do M3
(`accept()`/`reject()` de transferência antes da correção).

**Cenário de exploração:** duplo toque em "pagar fatura" na UI, ou duas abas,
disparam `POST /invoices/:id/pay` em paralelo. As duas passam pela checagem
`status === "paid"` antes de qualquer commit, então as duas criam uma
transação de despesa real (`payment`) debitando a conta escolhida — **duplo
pagamento registrado**, e a fatura final fica com só um
`paymentTransactionId` (o da última escrita), órfão do outro pagamento.
Nenhuma rota de fatura tem rate limit específico (mesmo padrão do achado #3
do M3).

**Mitigação sugerida:** `UPDATE cardInvoices SET status='paid',
payment_transaction_id=? WHERE id=? AND status <> 'paid' RETURNING *`; se não
retornar linha, tratar como `invoice_already_paid` e reverter (throw dentro
do `uow.run`) a transação de despesa já criada — mesmo padrão aplicado nos
achados do M3.

---

### 2. [Alto] Parcelas de cartão: `createTransaction` comita parcialmente quando uma fatura futura já está paga (return normal em vez de throw)

**Arquivo:** `apps/backend/src/application/use-cases/transaction/create-transaction.ts:96-126`

**Problema:** no branch de crédito, o loop de parcelas roda dentro de
`deps.uow.run(...)`. Se a fatura de uma parcela futura (`i`-ésima) já estiver
`paid` (linha 104), a função faz `return "invoice_paid" as const;` —
um **retorno normal**, não um `throw`. `unit-of-work.ts:8`
(`run: (fn) => db.transaction((tx) => fn(createRepositories(tx)))`) usa o
comportamento padrão do Drizzle: a transação **comita** em qualquer retorno
normal do callback e só reverte em exceção lançada. Resultado: as parcelas
`0..i-1` (e seus registros de auditoria) já foram inseridas e ficam
persistidas de verdade, mas a use-case devolve `left("invoice_paid")` — como
se **nada** tivesse acontecido. O chamador/UI mostra erro; o usuário nunca
vê essas parcelas fantasma na resposta, mas elas estão no banco.

**Cenário de exploração:** não precisa nem de concorrência — se o usuário
(ou um fluxo automático) já pagou antecipadamente uma fatura de um mês
futuro, e depois cria uma compra parcelada cuja 3ª parcela cairia nessa
fatura já paga, as parcelas 1 e 2 ficam lançadas e cobradas de verdade, e o
erro reportado ("fatura paga") sugere que a operação toda falhou. Fica ainda
mais provável combinado com o achado #1 (uma corrida de `payInvoice`
marcando a fatura como paga bem no meio da criação das parcelas).

**Mitigação sugerida:** trocar o `return "invoice_paid"` por `throw` de um
erro tipado, capturado fora do `uow.run` (padrão já usado em
`accept-transfer.ts`/`confirm-reimbursement.ts` pra reverter o que já foi
criado na mesma transação lógica).

**Nota (resposta à pergunta do roteiro):** fora desse caminho específico, o
loop de parcelas está corretamente dentro de uma transação real
(`db.transaction`) — uma falha por exceção (erro de FK, erro inesperado)
reverte tudo certo. O problema é só esse retorno "de sucesso disfarçado de
erro" que não passa pelo mecanismo de rollback.

---

### 3. [Médio] Editar/excluir transação de uma fatura que está sendo paga na mesma hora

**Arquivos:**
- `apps/backend/src/application/use-cases/transaction/update-transaction.ts:25,59`
- `apps/backend/src/application/use-cases/transaction/delete-transaction.ts:16,30`
- `apps/backend/src/application/use-cases/transaction/helpers.ts:5-9` (`isInPaidInvoice`)

**Problema:** ambas as use-cases checam `isInPaidInvoice(existing)` **antes**
de abrir `uow.run` — não há re-checagem dentro da transação de escrita para
o caso simples (transação avulsa). Em `deleteTransaction`, o caso de grupo de
parcelas (linha 20-28) até re-checa `isInPaidInvoice` por parcela **dentro**
do `uow.run` (boa prática), mas o caso de transação única (linha 30,
`targets = [existing]`) não tem essa re-checagem.

**Cenário de exploração:** usuário edita o valor/descrição de uma transação
(ou a exclui) bem no momento em que `payInvoice` (achado #1) está fechando a
fatura que a contém. Se `payInvoice` commita entre a checagem e o commit do
update/delete, a transação "imutável por fatura paga" (regra do spec) muda
depois do pagamento — o total realmente pago (fixado no momento do
`payInvoice`) passa a divergir da soma atual das transações da fatura
(`invoice.repository.ts:total`, que é sempre recalculada on-the-fly).

**Mitigação sugerida:** re-checar `isInPaidInvoice` dentro do `uow.run`,
igual ao padrão já usado no caminho de grupo de parcelas do `deleteTransaction`.

---

### 4. [Alto] Confirmação de ocorrência recorrente — duplicata real possível, sem constraint de banco protegendo

**Arquivos:**
- `apps/backend/src/application/use-cases/recurring/confirm-occurrence.ts:16-23`
- `apps/backend/src/infra/db/repositories/transaction.repository.ts:77-80` (`findByRecurringAndDate`)
- `apps/backend/src/application/use-cases/notification/sweep.ts:91-134` (`sweepRecurringAutoLaunch`)
- `packages/db/src/schema/transaction.ts:69-75` (índices — nenhum `unique` em `recurring_id`+`date`)

**Problema:** `confirmOccurrence` lê `findByRecurringAndDate(recurringId,
date)` pra checar se já existe, e só então chama `createTransaction` — que
abre sua **própria** transação (`uow.run`) separada da leitura de checagem.
Não há lock nem `UPDATE` condicional envolvido: é puro
check-(round-trip)-then-insert, sem nenhuma constraint `UNIQUE` no banco
sobre `(recurring_id, date)` que pegasse a duplicata na escrita (confirmado
no schema: só há índices não-únicos em `workspace_id+date`, `account_id`,
`invoice_id`, `category_id`, `description_normalized`).

**Cenário de exploração concreto (exatamente o que o roteiro pediu pra
verificar):** o sweep (`main/worker.ts:68-78`) roda uma vez no boot do
worker e depois a cada 24h via `setInterval` **por processo** — não é um job
idempotente coordenado do BullMQ. Isso significa: (a) todo restart do worker
em dev/deploy dispara um novo sweep imediato (o próprio comentário do código
admite isso), e (b) se houver mais de um processo/réplica do worker rodando
(comum em rolling deploy com zero downtime, ou escala horizontal), **cada
um roda seu próprio sweep independente**, sem nenhuma coordenação entre eles.
Um usuário confirmando manualmente uma ocorrência (`POST
/recurring/:id/occurrences/confirm`) no exato momento em que
`sweepRecurringAutoLaunch` está processando a mesma regra pro mesmo dia (ou
dois processos de worker rodando o sweep ao mesmo tempo) passam os dois pela
checagem `findByRecurringAndDate`/`confirmedOccurrenceKeys` antes de
qualquer um commitar sua `createTransaction` — **duas transações reais** são
criadas para a mesma ocorrência/data.

**Por que a proteção existente não é suficiente:** `confirmedOccurrenceKeys`
(usado pelo sweep) e `findByRecurringAndDate` (usado pela confirmação manual)
são só leituras — nenhum dos dois é uma trava atômica; ambos sofrem do mesmo
problema de isolamento READ COMMITTED já documentado no achado #1 do M3.

**Mitigação sugerida:** adicionar um índice `UNIQUE` parcial em
`transactions (recurring_id, date) WHERE recurring_id IS NOT NULL`, e tratar
a violação de unicidade (`isUniqueConstraintError`, já existe em
`application/errors.ts`) como `occurrence_already_confirmed` dentro do
`createTransaction`/`confirmOccurrence`. Isso resolve o caso tanto de duas
chamadas manuais quanto de dois sweeps concorrentes, sem precisar de lock
explícito.

---

### 5. [Médio] Convite de workspace: `acceptInvite` nunca re-checa o próprio `status` dentro da transação — corrida com `revokeInvite`

**Arquivos:**
- `apps/backend/src/application/use-cases/workspace/accept-invite.ts:11-62`
- `apps/backend/src/application/use-cases/workspace/revoke-invite.ts:7-30`
- `apps/backend/src/infra/db/repositories/workspace-invite.repository.ts:38-40` (`updateStatus`, `UPDATE` incondicional, sem `fromStatus`)

**Problema:** `acceptInvite` checa `invite.status !== "pending"` **uma única
vez**, fora do `uow.run` (linha 19). Dentro da transação (linha 46-59), só
re-checa `existingRole` (pra decidir se adiciona membro, e por causa do
limite de plano) — nunca re-checa o `status` do convite antes de chamar
`updateStatus(invite.id, "accepted")`. `revokeInvite` tem exatamente o mesmo
formato: lê, checa `status !== "pending"` (linha 18), e faz um `UPDATE`
incondicional (`updateStatus`, sem `WHERE status = 'pending'`) logo em
seguida — sem transação nenhuma ao redor, nem uma re-checagem.

**Cenário de exploração:** um admin revoga um convite pendente
(`POST /invites/:id/revoke`) quase ao mesmo tempo em que o convidado aceita
(`POST /invites/:id/accept`) — ex.: o convidado já tinha a tela de aceite
aberta quando o admin se arrepende e revoga. Duas interleavings possíveis,
ambas ruins:
- Se o `accept` já tinha passado pela checagem `status !== "pending"`
  (verdadeiro, ainda pendente) antes do `revoke` commitar, o `accept`
  prossegue e roda `addMember` + `updateStatus(..., "accepted")`
  incondicional — **o usuário vira membro do workspace mesmo depois do
  admin ter revogado o convite**, e o registro final do convite fica
  "accepted" (a revogação foi silenciosamente perdida).
- Na ordem inversa, o `revoke` commita primeiro e sobrescreve pra
  "revoked" — mas se o `accept` já tinha adicionado o membro (que fica,
  membership não é desfeita por essa corrida), o convite mostra "revogado"
  enquanto a pessoa já é membro efetivo. Estado de auditoria inconsistente
  de qualquer forma que resolva a corrida.

**Diferença em relação ao achado #2 do M3 (confirm-reimbursement etc.):**
aqui os dois lados da corrida são atores **diferentes** com interesses
opostos (admin querendo bloquear vs. convidado querendo entrar) — não é só
duplo-clique do mesmo usuário, então a severidade é maior que puro
UX-retry.

**Mitigação sugerida:** mesmo padrão do M3 — `updateStatus` em ambos os
fluxos vira `UPDATE ... WHERE id = ? AND status = 'pending' RETURNING *`
(exigindo `fromStatus`, igual ao que foi feito em `split-share.repository.ts`
no M3); 0 linhas afetadas em `acceptInvite` vira `invite_not_pending` (e
reverte o `addMember` já feito na mesma transação, se a ordem for
"adicionar membro, depois marcar aceito" e a marcação perder a corrida — hoje
a ordem já é assim, então dá pra colocar a marcação condicional PRIMEIRO e só
adicionar o membro se ela suceder, evitando até precisar de rollback).

---

### 6. [Baixo/Informativo] `acceptInvite` — duplo aceite em paralelo: protegido por constraint única, mas gera erro 500 genérico em vez de resposta graciosa

**Arquivo:** `apps/backend/src/application/use-cases/workspace/accept-invite.ts:46-59`

**Análise:** diferente do achado #5, o duplo-aceite do **mesmo** convite (dois
cliques, duas abas) **não** gera duplicidade de membership: `workspaceMembers`
tem `uniqueIndex("workspace_members_unique_idx").on(t.workspaceId, t.userId)`
(`packages/db/src/schema/workspace-member.ts:23`). A segunda chamada, ao
tentar `addMember`, recebe uma violação de unique constraint do Postgres
(`23505`) que **não é tratada** — diferente de `register.ts:64`, que usa
`isUniqueConstraintError` (definido em `application/errors.ts`) pra traduzir
a mesma classe de erro em `left("email_taken")`. Aqui a exceção crua sobe
até o `onError` global (`http/error-handler.ts`), que devolve um 500
sanitizado (`internal_error`) — sem vazar detalhes, mas também sem virar uma
resposta de negócio limpa tipo "convite já aceito". Sem risco de segurança
ou corrupção; é uma lacuna de tratamento de erro/UX.

**Mitigação sugerida (baixo custo):** envolver o `addMember` num
`try/catch` com `isUniqueConstraintError` e devolver sucesso idempotente (ou
`invite_already_accepted`), igual ao padrão já usado em `register.ts`.

---

## Verificado e está ok

### Saldo derivado (`balanceDelta`) — inerentemente sem corrida
`apps/backend/src/infra/db/repositories/transaction.repository.ts:99-119`.
Confirmado: não existe em lugar nenhum do backend uma coluna de "saldo atual"
armazenada e mutada por transação. `bankAccounts.initialBalance`
(`packages/db/src/schema/bank-account.ts:22`) é setado uma vez na criação da
conta e só é reescrito por `update-account.ts:29` como um **valor
absoluto** vindo do input do usuário (não é um `initialBalance =
initialBalance + delta`, é um `SET initial_balance = ?` direto) — não há
padrão read-modify-write em lugar nenhum sobre esse campo, então mesmo duas
edições concorrentes desse campo são só last-write-wins de um valor
declarado, sem lógica financeira pra corromper. O saldo exibido
(`list-accounts.ts:21`, `monthly-summary.ts:57`) é sempre `initialBalance +
balanceDelta(accountId)`, e `balanceDelta` é uma agregação `SUM` calculada
na leitura sobre todas as transações não deletadas da conta — duas
transações criadas em paralelo na mesma conta são só duas linhas
independentes inseridas; a soma seguinte reflete as duas automaticamente,
sem nenhum "saldo" intermediário pra duas escritas disputarem. Confirmado:
nenhum lugar do backend cacheia ou armazena um saldo mutável em paralelo.

### `card_invoices` — `getOrCreate` é o padrão CORRETO já usado no código (contraste com `markPaid`/`setStatus` no mesmo arquivo)
`apps/backend/src/infra/db/repositories/invoice.repository.ts:16-41`. Ao
contrário de `markPaid`/`setStatus` (achado #1), `getOrCreate` já resolve a
corrida certo: `.insert(...).onConflictDoNothing()` contra o índice único
`card_invoices_card_period_idx` (`cardId`, `yearReference`,
`monthReference` — `packages/db/src/schema/card-invoice.ts:36`), e se a
inserção não retornar linha (perdeu a corrida), refaz o `find()` pra pegar a
fatura que a outra chamada concorrente acabou de criar. Vale citar como
exemplo de que o time já conhece o padrão certo — só não foi aplicado
uniformemente no resto do arquivo.

### Exclusão de conta (LGPD) — duplo-clique/chamada dupla é seguro
`apps/backend/src/application/use-cases/auth/delete-account.ts:29-54`. Duas
chamadas paralelas de `deleteAccount` pro mesmo usuário convergem sem erro:
`repos.user.delete` (`user.repository.ts:43-45`) e `repos.workspace.delete`
(`workspace.repository.ts:69-71`) são `DELETE ... WHERE id = ?` sem
checagem de linhas afetadas — a segunda chamada, ao tentar deletar um
usuário/workspace que a primeira já removeu (e commitou), simplesmente
bloqueia no lock de linha do Postgres até a primeira transação terminar e
depois executa como no-op (0 linhas afetadas, sem exceção). `countOwners`
(`workspace.repository.ts:51-57`) é recalculado dentro de cada transação a
partir do estado committed mais recente, então a segunda chamada nunca vê um
dado "congelado" desatualizado o suficiente pra causar dupla exclusão ou
erro. Não foi encontrado nenhum caminho de corrupção nessa dupla-chamada.

Investigado também o cruzamento com transferências pendentes: `fromUserId`/
`toUserId` em `inter_user_transfers` têm `onDelete: "cascade"`
(`packages/db/src/schema/inter-user-transfer.ts:20,27`), então excluir a
conta do remetente **antes** de excluir os workspaces dele (ordem já
garantida pelo comentário/código em `delete-account.ts:22-27`) remove
qualquer transferência pendente que o envolvesse antes de tentar apagar a
transação (`fromTransactionId`/`toTransactionId` são `onDelete: "restrict"`
— exigiriam que o convite/transferência já tivesse sumido antes). Uma
corrida entre "sender exclui a conta" e "recipient aceita a mesma
transferência pendente" resolve das duas formas possíveis sem corrupção,
graças à correção já aplicada no M3 (`accept()` agora é condicional e
reverte se perder a corrida) — na pior interleaving, o registro do
`inter_user_transfer` desaparece (cascata do usuário excluído) mas a
transação de crédito que o destinatário já recebeu permanece (efeito
colateral aceitável de anonimização LGPD, não uma falha de integridade).

### Parcelas de cartão — dentro de uma transação real (exceto o caso do achado #2)
`apps/backend/src/application/use-cases/transaction/create-transaction.ts:96-124`
roda o loop de criação de N parcelas dentro de `deps.uow.run(...)`, que é
`db.transaction()` de verdade (`infra/db/unit-of-work.ts:8`). Uma falha por
**exceção** no meio do loop (erro de FK, erro de conexão, etc.) reverte
corretamente tudo — não fica lixo parcial nesse caso. O único jeito de
"vazar" um commit parcial é o `return "invoice_paid"` do achado #2 (retorno
normal, não exceção) — fora esse caminho específico, o mecanismo de
transação está correto.

### Transferência/split — nenhuma regressão nova encontrada além do já corrigido no M3
Não foi encontrado nenhum outro `UPDATE`/`INSERT` incondicional sobre
`status` nos módulos de transferência e split além dos já corrigidos
(`inter-user-transfer.repository.ts`, `split-share.repository.ts`,
`expense-split.repository.ts` — todos já com `WHERE status = ...`
condicional aplicado no round anterior).

---

## Resumo

**8 achados**, nenhum repetido do `m3-gaps-seguranca.md`:
- **Alto: 3** — pagamento de fatura duplicável (`markPaid` incondicional,
  achado #1); commit parcial de parcelas quando a use-case pensa que
  devolveu erro (`return` em vez de `throw` em `createTransaction`, achado
  #2); duplicata real de transação de recorrência sem constraint de banco,
  agravado por múltiplos sweeps rodando em paralelo por processo (achado #4).
- **Médio: 2** — edição/exclusão de transação escapando da imutabilidade de
  fatura paga por falta de re-checagem dentro da transação (achado #3);
  corrida `acceptInvite`/`revokeInvite` sem re-checagem de status que pode
  deixar um usuário entrar num workspace mesmo depois do convite ter sido
  revogado (achado #5).
- **Baixo/Informativo: 1** — duplo-aceite do mesmo convite gera 500 cru em
  vez de erro de negócio limpo (protegido por constraint única, sem risco
  real, achado #6).

**Os três mais importantes:** (1) pagamento de fatura duplicável — mesmo
padrão exato já corrigido em transferências/split, mas nunca aplicado ao
módulo de cartão; (2) o `return "invoice_paid"` no meio do loop de parcelas
comita silenciosamente o que já foi inserido enquanto reporta erro pro
usuário — bug de corretude que nem precisa de concorrência real pra
acontecer; (3) confirmação de recorrência sem nenhuma constraint de banco
protegendo contra duplicata, com uma superfície de corrida concreta e não
hipotética: sweep por processo (`setInterval`) rodando em paralelo com
confirmação manual, ou múltiplas réplicas do worker cada uma disparando seu
próprio sweep independente.

## Ações tomadas (2026-07-19)

Achado corrigido: `update-transaction.ts` e `delete-transaction.ts` (caminho de
transação única — o de grupo de parcelas já re-checava por parcela) agora
re-checam `isInPaidInvoice` como primeira operação dentro do `uow.run`, antes de
qualquer escrita. Se a fatura foi paga entre o check inicial e a execução da
transação, lança um erro sentinela local (`InvoiceNowPaidError`) que aborta o
`db.transaction()` sem escrever nada, traduzido pra `left("invoice_paid")` fora
do `uow.run`. Suíte completa: 153/153 passando.
