# M5-01 — Calculadora de fórmulas customizadas (dashboard web)

**Status:** 🟢 Concluída (2026-07-26, validada ponta a ponta)

## Refinamentos de UX pós-implementação (2026-07-26)

Rodada de ajustes reportados pelo usuário testando a feature de verdade:

- **Visual da calculadora**: overlay próprio sem `backdrop-blur` (o padrão
  do dialog compartilhado borra e dá um tom azulado no fundo) e teclado
  numérico com grid 4 colunas — reforça a "cara de calculadora" em vez de
  um form genérico.
- **Select nativo quebrado no dark mode**: `color-scheme: dark` via CSS
  (mesmo aplicado direto no `select`) não bastou — bug de renderização do
  popup nativo do Chromium/Windows, confirmado em várias rodadas mesmo com
  o CSS certo. Resolvido substituindo o `<select>` nativo por um
  `Select.Root`/`Content` do Bits UI (`select-field.svelte`), popup
  100% HTML/CSS próprio, sem depender do SO.
- **Dialog preso fora da tela / impossível arrastar**: causa real era
  estrutural — a técnica `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
  empurra o conteúdo pra fora do viewport quando ele é mais alto que a
  tela, independente do drag. Trocado por `inset-4 + margin: auto +
  max-height: calc(100vh - 2rem)`, que não consegue estourar o viewport
  por construção; o offset de drag virou `translate(Npx, Npx)` direto.
- **Widget fixado não aparecia sem F5**: `update()` do `use:enhance` não
  bastava pra refletir o novo estado nos widgets da Home/Transações —
  faltava `invalidateAll()` explícito (do `$app/navigation`) no callback
  de submit do dialog.
- **Fixação em ambas as telas ao mesmo tempo**: o modelo original
  (`pinnedTo`: `none`/`home`/`transactions`, escolha única) não permitia
  a mesma fórmula virar widget na Home E em Transações simultaneamente.
  Migrado pra duas colunas booleanas independentes,
  `pinnedHome`/`pinnedTransactions` (duas migrations — `ADD` primeiro,
  `DROP` da coluna/enum antigos depois — pra evitar o prompt interativo
  de detecção de rename do `drizzle-kit`, que exige TTY e trava neste
  ambiente).
- **Pin ao lado da fórmula salva**: em vez de só alternar via os dois
  `Switch` dentro do form de criar/editar, cada fórmula na lista
  "Fórmulas salvas" ganhou um ícone de pin (`PushPinIcon`) que abre um
  popover com os dois toggles — fixa/desfixa na Home e em Transações sem
  precisar abrir "Editar". Nova action `pinFormula` (schema Zod dedicado,
  `pinFormulaSchema`) faz um PATCH parcial só com os dois booleanos,
  reaproveitando o `PATCH` parcial que o backend já aceitava.

Validado: `tsc --noEmit` (backend/db/formula), `svelte-check` (dashboard,
0 erros), suíte de testes do backend (8 testes de saved-formula, todos
verdes), `bun run lint` (Biome), `prettier --check` + `eslint`
(dashboard), build de produção do dashboard, e smoke test via API direta
(criar fórmula com `pinnedHome=true`, PATCH `pinnedTransactions=true`,
confirmar os dois `true` simultaneamente na listagem).

## Implementação (2026-07-26)

Tudo implementado conforme planejado, com um refinamento sobre o escopo
original: a camada de "catálogo de variáveis" (`formula-variables.ts`)
ficou em `application/use-cases/saved-formula/` no backend (não em
`domain/services/`) porque ela orquestra outro use-case
(`monthlySummary`) — clean architecture não permite domain depender de
application.

**Pacote `packages/formula`** (`@finance/formula`): `evaluateFormula()`
usando `expr-eval`, mas com os mapas internos do parser (`functions`,
`unaryOps`, `binaryOps`, `ternaryOps`, `consts`) substituídos
manualmente pra restar só `+ - * /` e parênteses — a opção `operators`
do construtor do `expr-eval` só desliga operadores simbólicos (`^`,
`%`, `==`...), não funções nomeadas (`sqrt`, `pow`, `min`...), que
ficam em mapas separados. Sem essa segunda camada, `sqrt(despesas)`
seria avaliado normalmente. Verificado com smoke test manual cobrindo
função bloqueada, potência bloqueada, constante bloqueada, divisão por
zero e sintaxe inválida — todos viram erro tipado, nenhum crash.

**Backend**: schema + migration, port/repository/use-cases/rotas no
mesmo padrão do módulo `notification`, `FREE_PLAN_LIMITS.
maxSavedFormulasPerWorkspace = 10`. 8 testes novos de use-case contra
Postgres real (token desconhecido, limite de plano, avaliação correta,
isolamento por workspace, mês encerrado sem `disponivel_projetado`,
atualização). Suíte completa do backend: 194 testes, 0 falhas.

**Dashboard**: `formula-dialog.svelte` (dialog arrastável via pointer
events manuais — primeiro elemento arrastável do codebase) integrado
na Home e em Transações. Decisão adicional durante a implementação: o
preview ao vivo (e a renderização dos widgets fixados) usa
`evaluateFormula` **direto no client**, com o catálogo de valores
derivado do `MonthlySummary` já carregado na página
(`lib/formula-catalog.ts`, espelhando a mesma lógica de
`formula-variables.ts` do backend) — zero round-trip de rede pra ver o
resultado. A rota HTTP `GET .../saved-formulas/variables` do backend
segue existindo (usada pra metadados fora do dashboard), mas o
dashboard não precisa dela porque já tem o resumo mensal carregado.

Validado ponta a ponta contra o backend/dashboard reais rodando:
usuário de teste registrado, fórmula criada via API direta e via
action do SvelteKit, valor recalculado corretamente após lançar uma
transação real, isolamento confirmado entre fórmula fixada em "home" e
em "transactions" (aparece só na página certa), `displayFormat`
moeda/número reproduzido fielmente.

Verificado: `bun run lint` (Biome, monorepo todo), `prettier --check` +
`eslint` do dashboard, `svelte-check`, `tsc --noEmit` do backend/db/
formula, suíte completa do backend (194 testes), build de produção do
dashboard, smoke test manual real (curl direto na API + login real no
dashboard + criação de transação + reload das páginas).

## Contexto

Ideia original do usuário (brainstorm bruto, registrado em
2026-07-25/26): permitir criar cálculos customizados usando operadores
aritméticos e "variáveis" que são, na prática, colunas/agregações do
banco (ex.: `(saldo_final - saldo_inicial) * soma(quantidade_transacoes)
em 14/04/2025 - 04/05/2025`), salvar como query nomeada, e anexar como
widget na Home/Transações (dashboard e app), com um dialog arrastável no
dashboard e uma calculadora funcional de verdade.

**Não corresponde ao escopo original de M5 no `spec.md`** ("workspaces
corporativos — contas por setor, integrações para empresas") — é uma
feature à parte que ficou com esse rótulo desde que foi anotada no
backlog. Fica registrada aqui do mesmo jeito, sem renumerar.

Sessão de planejamento em 2026-07-26 (3 agentes Explore — backend,
dashboard, mobile) levantou o terreno:
- **Não existe nenhuma lib de parsing de expressão** em nenhum
  `package.json` do monorepo — precisaria ser escrita do zero ou
  adicionada como dependência nova.
- **Não existe conceito de "widget"** implementado em lugar nenhum (nem
  dashboard, nem mobile) — é tabela nova, do zero. (O widget de tela
  inicial Android citado no `spec.md`/M1 é conceito totalmente
  diferente — RemoteViews nativo, nunca implementado — e não tem
  nenhuma relação técnica com este.)
- **Não existe dialog arrastável** no dashboard — `Dialog.Content` (Bits
  UI) é sempre centralizado via CSS fixo, sem nenhuma lib de drag
  instalada.
- Valores como "saldo" e "total de fatura" são sempre **derivados** via
  SQL agregado na camada repository (nunca coluna própria) — padrão
  já estabelecido: port → repository (Drizzle) → use-case, visto em
  `monthly-summary.ts` + `transaction.repository.ts`.
- Limite por plano já existe como constante simples (`FREE_PLAN_LIMITS`
  em `plan-limits.ts`), fácil de estender.

## Decisões fechadas com o usuário (2026-07-26)

1. **Escopo da fórmula (v1)**: só aritmética (`+ - * / ( )`) sobre um
   catálogo FIXO de variáveis pré-calculadas — nada de datas em texto
   livre nem função de agregação livre digitada pelo usuário (a versão
   "mini-SQL com data embutida na string" do exemplo original foi
   descartada por custo/risco — exigiria escrever uma gramática própria
   capaz de parsear datas em texto livre). Período vem da própria
   navegação de mês que a Home já tem (query params `year`/`month`).
2. **Plataforma**: só dashboard web nesta v1. App mobile fica pra uma
   fase 2 separada (UI bem diferente — calculadora tipo teclado
   numérico, tela própria, sem dialog arrastável).
3. **Dialog arrastável**: sim, já no v1 (drag manual via pointer events,
   sem lib nova).
4. **Cache**: sem cache — recalcula ao vivo a cada carregamento,
   reaproveitando as mesmas queries que a Home já faz.

## Catálogo de variáveis (v1)

Todas derivadas do que `getMonthlySummary` já calcula pro mês ativo da
Home (reaproveita `monthlyTotals`/`expenseByCategory` do
`transaction.repository.ts`, sem nova query pesada):

| Token | Origem | Observação |
|---|---|---|
| `receitas` | `MonthlySummary.income` | |
| `despesas` | `MonthlySummary.expense` | |
| `saldo` | `MonthlySummary.balance` | |
| `disponivel_projetado` | `MonthlySummary.projectedAvailable` | pode ser `null` (mês fechado) — erro de runtime tratado, não crash |
| `despesa_categoria_<categoriaIdSemHifen>` | `expenseByCategory` | um token por categoria do workspace; UI insere o token ao clicar, usuário nunca digita cru |

Resultado exibido conforme `displayFormat` (`currency`/`number`),
escolhido pelo usuário ao salvar — evita adivinhar se o resultado de uma
divisão (ex. `despesas / receitas`) ainda é "dinheiro" ou virou índice.

## Avaliador de expressão — pacote novo `packages/formula`

A lógica de parsing/avaliação é pura (sem I/O, sem acesso a banco) e vai
ser reaproveitada em pelo menos 3 lugares (backend, preview ao vivo no
dashboard, e futuramente o app mobile na fase 2) — decisão do usuário
(2026-07-26): extrair pra um pacote novo do monorepo em vez de deixar
só dentro do backend, no mesmo padrão de `packages/shared`.

`packages/formula/` (`@finance/formula`, `package.json` no molde de
`packages/shared/package.json`: `exports: { ".": "./src/index.ts" }`,
script `typecheck`, dependência `expr-eval`; pego automaticamente pelo
glob `packages/*` já existente no workspace root, sem mexer em
`turbo.json`):
- `src/evaluate.ts` — `evaluateFormula(expression, variables:
  Record<string, number>): Either<FormulaError, number>`, validando
  que todo identificador da expressão existe em `variables` (rejeita
  token desconhecido com erro tipado antes de chamar o `Parser.evaluate`
  do `expr-eval`) e tratando divisão por zero/erro de sintaxe como erro
  tipado também (nunca lança exceção crua pro chamador).
- `src/index.ts` reexportando o necessário.

Consumidores:
- **Backend** (`apps/backend`): use-case `evaluate-saved-formula`
  monta o catálogo de valores reais (via `formula-variables.ts`, que
  continua no backend — só a parte de I/O com o banco fica lá) e chama
  `evaluateFormula` do pacote pra avaliação **autoritativa** (a que
  realmente persiste/retorna pro cliente).
- **Dashboard** (`apps/dashboard`): preview ao vivo no
  `formula-dialog.svelte` chama `evaluateFormula` **direto no client**
  com os valores já carregados na página (resumo mensal + categorias já
  vêm no `data` da Home) — sem round-trip de rede a cada tecla. O
  "salvar" continua indo pro backend pra validação/persistência de
  verdade (nunca confiar só na validação client-side pro que é
  gravado).
- **Mobile** (fase 2, futuro): mesma lib pro calculador local.

## Escopo — backend (mesmo padrão do módulo `notification`)

1. `packages/db/src/schema/saved-formula.ts` — tabela `saved_formulas`
   (`id`, `workspaceId`, `createdByUserId`, `name`, `expression`,
   `displayFormat`, `pinnedTo` enum `none`/`home`/`transactions`,
   `createdAt`, `updatedAt`). Sem soft delete (config do usuário, não
   registro financeiro).
2. Migration (`bun run db:generate`).
3. Port `saved-formula-repository.ts` + implementação Drizzle.
4. `apps/backend` ganha `@finance/formula` como dependência. Use-cases
   (`list-formula-variables`, `create-saved-formula`,
   `update-saved-formula`, `delete-saved-formula`, `list-saved-formulas`,
   `evaluate-saved-formula`) — criar/editar/excluir é `member+`, ver é
   `viewer+`. `evaluate-saved-formula` importa `evaluateFormula` do
   pacote pra avaliação autoritativa.
5. Rotas HTTP + registro em `main/app.ts`.
6. `FREE_PLAN_LIMITS.maxSavedFormulasPerWorkspace = 10`.
7. Testes de use-case contra Postgres real: token desconhecido rejeita
   na criação; limite de plano bloqueia a 11ª fórmula; `evaluate` bate
   com o número certo; isolamento por workspace; `disponivel_projetado`
   nulo não quebra.

## Escopo — dashboard

0. `apps/dashboard` ganha `@finance/formula` como dependência (mesmo
   pacote do backend — só a avaliação pura, sem chamar API).
1. `lib/schemas/formula.ts` (Zod) + `lib/server/formula-api.ts`.
2. `lib/components/calculator/formula-dialog.svelte` — dialog
   arrastável (header como alça de drag via pointer events,
   `dragOffset` em `$state`, sem lib nova — primeiro elemento arrastável
   do codebase). Corpo: campo de texto pra expressão (não teclado
   numérico — desktop já tem teclado físico, diferente do mobile) +
   chips clicáveis com variáveis disponíveis (nome + descrição) +
   preview do resultado ao vivo + nome + `displayFormat` + `pinnedTo` +
   lista de fórmulas salvas (editar/excluir).
3. Home: nova seção "Fórmulas salvas" (só renderiza se houver alguma
   com `pinnedTo === 'home'`), mesmo estilo visual dos stat tiles.
4. Transações: mesma ideia pra `pinnedTo === 'transactions'`.

## Fora de escopo nesta v1 (backlog de continuação)

- App mobile (calculadora com teclado numérico, tela própria).
- Variáveis fora do catálogo fixo (por conta, por cartão, por método).
- Múltiplos widgets reordenáveis por drag-and-drop (v1 empilha na ordem
  de criação).

## Dependências

Nenhuma task-dependência — todo o backend necessário (resumo mensal,
categorias, gate de papel, limite de plano) já existe. Dependência
técnica nova: pacote `packages/formula` (`@finance/formula`) criado
como parte desta task, antes do resto do backend/dashboard (é
pré-requisito de ambos).

## Critério de conclusão

Usuário monta uma fórmula real (ex. `despesas - receitas`) no dialog
arrastável, salva, fixa na Home, e o card aparece com o número certo —
validado ponta a ponta contra o backend/dashboard reais rodando, com
testes de use-case cobrindo os casos de erro (token desconhecido, limite
de plano, mês fechado).
