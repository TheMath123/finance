# Auditoria de fechamento — M1

**Data:** 2026-07-19
**Escopo:** M1 (auth + recuperação de senha, workspace pessoal auto-criado, CRUD de
bancos/contas/cartões/categorias/transações, geração de fatura, soft delete, AuditLog
write-only, telas do app com onboarding + widget + previsão determinística).

Contexto: a maior parte do M1 foi implementada antes da convenção de task docs existir
(só existem `tasks/done/02, 04, 05, 06, 07`), então esta auditoria trabalhou direto a
partir do `spec.md` e da leitura do código (backend `apps/backend/src`, app
`apps/mobile/src`), não de um checklist de tasks. O repo já avançou além do M1 (M2 e M3
parcialmente implementados/commitados), então alguns comportamentos "M2" aparecem no
código (ex.: leitura de AuditLog, IA de previsão de gastos variáveis) — isso é esperado
e não é tratado como gap do M1.

## Gaps encontrados

### 1. Widget de resumo financeiro (Android) — não implementado

**Severidade:** Média-Alta (é item explícito do escopo do M1 no spec, seção "App" e
"Milestones", mas nunca saiu do papel)
**Arquivo:** não existe nenhum arquivo de widget em `apps/mobile` — nenhuma referência a
`react-native-android-widget` fora do próprio `spec.md` e de
`tasks/backlog/01-widget-tela-inicial.md`.
**Descrição:** o spec pede "Widget de tela inicial com resumo financeiro (saldo
disponível + próxima fatura) do workspace ativo", stack `react-native-android-widget`
(JSX → RemoteViews) + cache local via AsyncStorage + `requestWidgetUpdate()`. Nada disso
existe. O pré-requisito técnico bloqueante original (dev build via `expo prebuild`, pastas
nativas `android`/`ios`) **já foi resolvido** — segundo `tasks/README.md`, a M2-10
(notificações push) já gerou essas pastas nativas — então não há mais bloqueio técnico,
só decisão de produto de adiar.
**Por que importa:** é a única peça do M1 que está genuinamente ausente (não "feita
diferente", ausente mesmo). Já está corretamente documentada como backlog consciente
(`tasks/backlog/01-widget-tela-inicial.md`), então não é uma lacuna "escondida" — mas
segue sendo trabalho pendente do M1 que uma auditoria de fechamento de milestone deve
listar como não concluído.

### 2. Competência de fatura/previsão não fixa timezone America/Sao_Paulo

**Severidade:** Média (correção comportamental em produção, mas indetectável em dev/CI se
rodarem já perto de UTC-3 ou com TZ do container coincidindo)
**Arquivos:**
- `apps/backend/src/domain/services/invoice-rules.ts:41` (`effectiveStatus`, parâmetro
  `today = new Date()`)
- `apps/backend/src/application/use-cases/summary/monthly-summary.ts:37-40` (`todayIso()`,
  usa `new Date()` + `getFullYear()/getMonth()/getDate()` locais)
**Descrição:** o spec fecha explicitamente (seção "Timezone e competência"): "Toda lógica
de competência (data da transação, `closing_day`, mês de referência) usa
**America/Sao_Paulo** fixa no M1." Na prática, o código usa `new Date()` e os getters
locais (`getFullYear`/`getMonth`/`getDate`) sem nenhuma fixação de timezone — nem
`process.env.TZ`, nem `date-fns-tz`/`luxon`, nem `Intl.DateTimeFormat` com
`timeZone: "America/Sao_Paulo"`. Não há `Dockerfile` nem env `TZ=America/Sao_Paulo` em
lugar nenhum do repo (`docker-compose.yml` não define `TZ` nem para o backend, que nem
está no compose). Se o processo do backend rodar num container com timezone padrão UTC
(comum em Railway/Fly.io/qualquer imagem `node`/`bun` base), "hoje" e o corte de
fechamento de fatura (`23:59:59` do `closing_day`) ficam desalinhados em até 3h do
horário real de Brasília — na prática, o efeito é pequeno na maioria dos dias (só
importa perto da virada da meia-noite BRT), mas é uma divergência de comportamento
direta com uma regra que o spec fechou explicitamente como obrigatória para o M1.
**Por que importa:** afeta o cálculo de "hoje" usado em (a) status efetivo de fatura
(`open`→`closed`), (b) corte do "disponível projetado" (o que conta como já
passado/ainda não aconteceu no mês) e (c) recorrências pendentes do mês — todos
cálculos financeiros sensíveis a data.

### 3. `bun run typecheck` na raiz não cobre o mobile

**Severidade:** Média (lacuna de processo/CI, não um bug de código agora)
**Arquivos:**
- `apps/mobile/package.json` (bloco `scripts`, sem entrada `"typecheck"`)
- `turbo.json:8-10` (task `typecheck` existe, mas sem script no package ela é
  silenciosamente pulada pelo Turborepo — sem erro, sem aviso)
- `.github/workflows/ci.yml:40-41` (step "Typecheck (turbo)" roda `bun run typecheck`)
**Descrição:** rodei `bun run typecheck` na raiz — passou "100%", mas o log mostra
"Packages in scope: ... mobile" e só 6 tasks executam (`backend`, `db`, `email`, `queues`,
`shared`, `storage`); `mobile` nunca aparece na lista de tasks rodadas porque não tem
script `typecheck`. Rodei manualmente `tsc --noEmit -p apps/mobile/tsconfig.json` e o
app **passa limpo hoje** (exit 0) — não há erro de tipo escondido agora — mas o CI
(`.github/workflows/ci.yml`) roda exatamente `bun run typecheck`, então qualquer
regressão de tipo futura no app mobile **não quebraria o CI**.
**Por que importa:** spec fecha "CI: rodar `bun test` + typecheck em todo push" sem
ressalva de escopo — a ausência do script faz o mobile ficar de fora dessa garantia
silenciosamente (sem falha visível apontando a lacuna).

## Achados menores (não bloqueiam, registrados por completude)

- **Onboarding "guiado" ficou só como seed silencioso** — `apps/backend/src/application/use-cases/auth/register.ts:36-58`
  cria workspace pessoal + categorias padrão + banco "Minha carteira" + conta "Conta
  principal" automaticamente no cadastro (bate com "nunca deixar o usuário numa tela
  vazia"), mas não existe nenhuma tela de boas-vindas guiando o usuário a personalizar
  isso (spec fala em "criação guiada da primeira conta/cartão"). Já é uma decisão de
  produto documentada e consciente em `tasks/backlog/03-onboarding-guiado.md` ("manter o
  comportamento silencioso atual por enquanto"), então não trato como gap novo — só
  confirmo que o estado real bate com o que o backlog já registra.
- **`findOrCreateBank` não grava `AuditLog`** —
  `apps/backend/src/application/use-cases/bank/find-or-create-bank.ts` cria a linha
  `Bank` por trás (ao criar conta/cartão com `bankCode` novo) sem chamar
  `repos.audit.record(...)`. Severidade baixíssima: a ação visível ao usuário (criar
  conta/cartão) é auditada normalmente pelo use case chamador
  (`create-account.ts`/`create-card.ts`); só a criação incidental da linha `Bank`
  (entidade não gerenciada diretamente pelo usuário no app, conforme decisão de
  2026-07-15) fica sem entrada própria no log.
- **TODO de organização em `apps/mobile/src/lib/schemas/auth.ts:5`** — comentário
  reconhece que os schemas de auth deveriam migrar para `packages/shared` quando o
  backend expuser schemas reutilizáveis; hoje ficam duplicados/espelhados
  manualmente entre app e backend. Não é um bug funcional, é dívida de organização já
  sinalizada no próprio código.

## Verificado e está ok

- **CRUD completo de Bank/BankAccount/Card/Category/Transaction/CardInvoice**: para cada
  entidade existe use-case + rota HTTP + repositório para create/list/update/delete (ou
  archive, onde a exclusão física é condicionada — ver abaixo). Rotas em
  `apps/backend/src/http/modules/{bank,account,card,category,transaction}/routes/`,
  use-cases em `apps/backend/src/application/use-cases/{bank,account,card,category,transaction}/`,
  repositórios em `apps/backend/src/infra/db/repositories/{bank,account,card,category,transaction}.repository.ts`.
  Bank não tem tela de gestão no app — isso é decisão de produto explícita e documentada
  no spec ("Usuário não cadastra banco manualmente"), as rotas de CRUD de Bank continuam
  existindo no backend só sem UI, exatamente como o spec pede.
- **Regras de arquivamento/exclusão batem com o spec**: `deleteAccount`
  (`apps/backend/src/application/use-cases/account/delete-account.ts`), `deleteBank`
  (`.../bank/delete-bank.ts`) e `deleteCard` (`.../card/delete-card.ts`) checam
  transações/uso existentes e recusam a exclusão física (`*_has_transactions`/`bank_in_use`)
  quando há vínculo, forçando arquivamento — bate exatamente com "Conta, cartão e banco
  com transações não são deletáveis — são arquiváveis". `deleteCategory`
  (`.../category/delete-category.ts`) reatribui transações para "Outros" (fallback do
  seed) e protege categorias `isDefault`/`isFallback` contra exclusão — bate com o spec.
- **Transação: edição/exclusão e imutabilidade de fatura paga**: `updateTransaction` e
  `deleteTransaction` (`apps/backend/src/application/use-cases/transaction/`) checam
  `isInPaidInvoice` e recusam mutação (`invoice_paid`) quando a transação está em fatura
  `paid`; parcelas têm valor/data travados; exclusão de compra parcelada propaga para
  todo o grupo não pago; tudo com soft delete (`softDelete`) e `AuditLog`. Exatamente as
  regras do spec ("Edição e exclusão").
- **Mobile: todas as telas de CRUD são alcançáveis por navegação real e chamam a API de
  verdade** (não mockada) — mapeei todos os `router.push`/`router.replace` do app e
  cruzei com os arquivos de tela existentes: `accounts/new`, `accounts/[accountId]`,
  `cards`, `cards/new`, `cards/[cardId]`, `categories`, `categories/new`,
  `categories/[categoryId]`, `transactions/trash`, `workspaces`, `workspaces/new`,
  `workspaces/[id]/members`, `workspaces/[id]/invite`, `workspaces/[id]/activity`,
  `variable-expense`, `invites`, `transfers`, `transfers/new`, `trusted-contacts`,
  `splits`, `whatsapp-link`, `profile`, `verify-email`, `notification-settings` — todas
  têm entrada de navegação real (menu "Mais"/`accounts.tsx`, botões de tela, ou fluxo de
  formulário) e usam clients (`accountsApi`, `cardsApi`, `categoriesApi`,
  `transactionsApi`, etc. em `apps/mobile/src/lib/*-api.ts`) que batem em endpoints
  reais — nenhuma tela mockada encontrada. Criar/editar transação, pagar fatura e
  gerenciar recorrências usam `Dialog` (não rota própria) conforme a decisão de
  2026-07-15 registrada no spec; criar/editar banco/conta/cartão/categoria são rotas
  próprias, também conforme o spec.
- **Geração/fechamento de fatura de cartão**: `apps/backend/src/domain/services/invoice-rules.ts`
  implementa `competencePeriod` (regra de `closing_day`), `addMonths` (parcelas
  consecutivas), `splitInstallments` (resto na primeira parcela) e `effectiveStatus`
  (fechamento calculado na leitura). `competencePeriod`/`splitInstallments` têm teste
  unitário direto em
  `apps/backend/src/application/use-cases/transaction/transaction.test.ts:131-139`;
  `effectiveStatus` não tem teste unitário próprio, mas é exercitado indiretamente por
  `listInvoices`/`payInvoice` (mesmo arquivo, linhas ~246-290) e pelo sweep de
  notificações (`apps/backend/src/application/use-cases/notification/notification.test.ts`,
  casos de `invoice_closed`/`invoice_due`) — cobertura funcional presente, só não
  isolada num arquivo `invoice-rules.test.ts` dedicado.
- **AuditLog write-only, mutações relevantes auditadas**: todo use-case de
  create/update/delete/archive de bank, account, card, category, transaction, recurring,
  workspace e split chama `repos.audit.record(...)` (confirmado por grep em todo
  `application/use-cases`). Não há rota de leitura do AuditLog fora do M2 — a rota
  `GET .../workspaces/:id/activity` existe (`list-activity.ts`), mas é entrega da M2-04
  (`tasks/done/m2-04-atividade-audit-log.md`), já concluída no repo; não é um vazamento
  do M1.
- **Onboarding: seed automático de categorias + banco + conta** — confirmado em
  `apps/backend/src/application/use-cases/auth/register.ts`, usando
  `DEFAULT_CATEGORIES` de `packages/db/src/default-categories.ts` (9 categorias,
  incluindo "Outros" como fallback não-deletável). Bate com o spec.
- **Previsão determinística (disponível projetado)** —
  `apps/backend/src/application/use-cases/summary/monthly-summary.ts` calcula
  `totalBalance + pendingIncome - pendingExpense - unpaidDue - variableExpenseTotal`,
  que corresponde à fórmula do spec (saldos + receitas recorrentes − despesas
  recorrentes − parcelas futuras de cartão − estimativa de gastos variáveis). A
  estimativa de gasto variável é uma adição da M2-08 (IA), já presente no código atual
  porque o repo já passou do M1 — a base M1 (recorrências + faturas não pagas) está
  correta e testada via os testes de `transaction.test.ts` (fluxo de fatura/parcela) e
  `estimate-variable-expense.test.ts`.
- **Testes do backend**: `bun --cwd=apps/backend test` → **146 pass, 0 fail** (397
  `expect()` calls, 19 arquivos, ~47s), com Postgres/Redis já de pé
  (`finance-postgres`/`finance-redis` via `docker ps`).
- **Typecheck**: `bun run typecheck` na raiz passa 100% nos 6 packages que têm o script
  (`backend`, `db`, `email`, `queues`, `shared`, `storage`) — ver gap #3 acima sobre o
  mobile ficar de fora dessa run.
- **Nenhum TODO/FIXME/stub/`throw new Error("not implemented")` real em arquivos de M1** —
  busquei `TODO|FIXME|not implemented|XXX:|HACK:` em `apps/backend/src` e
  `apps/mobile/src` (excluindo os módulos de M2/M3 apontados no pedido); os únicos
  matches reais (não falsos-positivos de palavras como "todos"/"método") foram o TODO de
  organização em `apps/mobile/src/lib/schemas/auth.ts:5` (já listado acima) — nenhum stub
  ou exceção de "não implementado" no caminho de CRUD/fatura/auditoria do M1.

## Resumo

6 itens no total: 3 gaps (severidade média/média-alta) + 3 achados menores (baixa
severidade, alguns já documentados como decisão de produto). Nenhum stub, nenhuma tela
mockada, nenhuma rota faltando para as entidades do M1 — a superfície de CRUD e as regras
de negócio financeiras (arquivamento, imutabilidade de fatura paga, soft delete,
auditoria) estão sólidas e testadas.

## Ações tomadas (2026-07-19)

Gap #3 corrigido: adicionado script `"typecheck": "tsc --noEmit"` em
`apps/mobile/package.json`. `bun run typecheck` na raiz agora cobre o mobile
também — confirmado via `bunx tsc --noEmit` limpo dentro de `apps/mobile`.
