# M5-01c — Calculadora: catálogo estendido, exibição agrupada e reorder

**Status:** 🟢 Concluída (2026-07-28)

Continuação de [M5-01](m5-01-calculadora-formulas-dashboard.md)/[M5-01b](m5-01b-calculadora-formulas-mobile.md).
Os três itens que ficaram registrados como "fora de escopo"/pendentes depois
do usuário testar a calculadora de verdade: exibição ruim das variáveis
(nome completo, lista plana), catálogo restrito demais, e widgets fixados
sem reorder. Decisões fechadas com o usuário antes de implementar: reorder
via **drag-and-drop de verdade** (não botões ▲▼) e as **três** variáveis
extras (conta, cartão, método) juntas.

## Item 1 — Exibição das variáveis (dashboard + mobile)

Chips agrupados por rótulo ("Resumo do mês", "Por categoria", "Por conta",
"Por cartão", "Por método de pagamento") em vez de uma lista plana —
`FormulaVariable`/`FormulaVariableValue` ganharam campo `group` nos três
lugares que espelham o catálogo (`formula-variables.ts` no backend,
`formula-catalog.ts` no dashboard e no mobile). Chips truncam o rótulo
(`max-w` + `truncate`/`numberOfLines`), nome completo disponível via
`title` (dashboard) ou `accessibilityLabel` (mobile, sem tooltip nativo em
toque).

## Item 2 — Catálogo estendido: conta, cartão, método de pagamento

Tokens novos, mesma regra de sanitização de `despesa_categoria_<id>`:

| Token | Origem |
|---|---|
| `saldo_conta_<id>` | saldo atual da conta (já derivado — `account.initialBalance + transaction.balanceDelta`) |
| `fatura_cartao_<id>` | total das faturas não pagas do cartão (`invoiceRepository.unpaidTotalByCard`, já existia) |
| `despesa_metodo_pix`/`_debito`/`_dinheiro`/`_credito` | despesa do mês por método (`transfer` fica de fora — movimentação neutra) |

Só o método de pagamento exigiu dado novo: `TransactionRepository.expenseByMethod`
(espelha `expenseByCategory`, troca o agrupamento por `method`). Contas e
cartões arquivados ficam fora do catálogo. `MonthlySummary` (backend)
ganhou `byMethod` (ao lado do já existente `byCategory`) — dashboard/mobile
usam isso pro catálogo client-side sem round-trip extra; contas/cartões já
eram carregados por outras partes das páginas Home/Transações (dashboard)
ou já tinham API própria (mobile), só precisou repassar pro
`buildClientFormulaCatalog`.

Testes novos em `saved-formula.test.ts`: saldo por conta correto e some
quando arquivada, fatura por cartão correta e some quando arquivado,
despesa por método soma certo.

## Item 3 — Reorder de widgets fixados via drag-and-drop

**Schema**: `saved_formulas` ganhou `homeOrder`/`transactionsOrder`
(integer nullable, migration aditiva simples). Auto-atribuídos ao fim da
fila quando uma fórmula vira `pinnedHome`/`pinnedTransactions` (criação ou
`false`→`true`); zerados quando volta a `false` — repin depois manda pro
fim da fila de novo, nunca reaparece na posição antiga. Lógica em
`create-saved-formula.ts`/`update-saved-formula.ts`, usando
`SavedFormulaRepository.maxOrder(workspaceId, field)` novo.

Novo use-case `reorder-saved-formulas.ts` + rota
`PATCH /workspaces/:workspaceId/saved-formulas/reorder` (`field: 'home'|'transactions'`,
`formulaIds: string[]` — a ordem desejada completa; cada uma vira o índice
dela na lista). Implementado como um loop de `repos.savedFormula.update`
dentro do `uow.run` (mais simples que uma query `CASE WHEN` — a lista de
widgets fixados é sempre pequena, e a transação garante atomicidade sem
precisar de SQL mais esperto). Gate `member+`. Testes: sequência persiste
certa, rejeita id de fórmula de outro workspace/não fixada naquele campo.

**Dashboard**: nova dependência `svelte-dnd-action` (Svelte 5, MIT). Grid
de widgets fixados (Home e Transações) vira `use:dndzone`; `$derived`
**gravável** (feature recente do Svelte 5 — reatribuir um `$derived`
sobrescreve até a dependência mudar de novo) guarda a ordem local durante
o arraste, `onfinalize` chama a action nova `reorderFormulas`
(`?/reorderFormulas`, mesmo padrão do `pinFormula` já existente) e
`invalidateAll()`. Evitado `$state` + `$effect` pra isso — o linter do
projeto (`svelte/prefer-writable-derived`) sinalizou a alternativa mais
simples.

**Mobile**: nova dependência `react-native-draggable-flatlist` (usa
`reanimated`/`gesture-handler`, já presentes). Descoberto e corrigido um
gap real: o app **nunca** envolvia a raiz em `GestureHandlerRootView`
(pré-requisito do `react-native-gesture-handler` para gestos funcionarem,
inclusive o drag desta lib) — adicionado em `app/_layout.tsx`.
`pinned-formulas.tsx` trocou o `.map()` por `DraggableFlatList`
(`scrollEnabled={false}`, item arrasta via toque longo — `onLongPress={drag}`),
com espelho local (`useState` + `useEffect` ressincronizando quando a
query mudar de verdade) pra não "voltar" visualmente enquanto o
`onDragEnd` persiste via `formulaApi.reorder` + invalidação da query.

## Nota de risco não verificável nesta sessão

A Home mobile (`(tabs)/index.tsx`) usa `Screen` com `scroll=true`, que
envolve o conteúdo num `ScrollView` real — o `DraggableFlatList` das
fórmulas fixadas fica **aninhado** dentro desse scroll. A lib tem
variantes "Nestable" (`NestableScrollContainer`/`NestableDraggableFlatList`)
feitas exatamente pra esse caso, mas usá-las exigiria trocar o `Screen`
padrão da Home por esse container especial, uma mudança maior de
estrutura só pra essa tela. Optei pela variante simples
(`scrollEnabled={false}`) por ora — funciona sem restruturar nada, mas o
gesto de arraste pode ter conflito com o scroll da página em torno dele.
**Não foi possível testar em dispositivo/emulador nesta sessão** (sem
ferramenta de automação mobile disponível) — recomendo validar o drag na
Home de verdade antes de considerar 100% pronto; se o gesto atrapalhar o
scroll da página, a correção é migrar pra `NestableScrollContainer` só
naquela tela. Em Transações não há esse risco (a seção de fórmulas fixadas
não fica dentro de nenhum `ScrollView`/`FlatList` externo).

## Validação

- `bun run --filter=@finance/backend typecheck` + `@finance/db` +
  `@finance/formula` — limpos.
- Suíte de `saved-formula.test.ts`: 15 testes, 0 falhas (rodada isolada,
  duas vezes).
- Suíte completa do backend (201 testes): instável em rodadas paralelas
  (falhas variam a cada execução, sempre em arquivos não tocados por essa
  task — `recurring.test.ts`/`workspace.test.ts` — nunca em
  `saved-formula.test.ts`). Confirmado pré-existente: a mesma falha
  ("visão mensal e projeção" + "duas confirmações paralelas") reproduziu
  rodando só `recurring.test.ts` isolado, inclusive contra o código sem
  as mudanças desta task (checado via `git stash` acidental durante a
  investigação, revertido em seguida com `git stash pop` sem perda).
- `svelte-check` do dashboard (0 erros), `prettier --check` + `eslint`
  (0 problemas), build de produção (`bun run --filter=@finance/dashboard build`,
  limpo).
- `tsc --noEmit` do mobile (limpo), `bun run lint` (Biome, monorepo
  inteiro, limpo).
- Smoke test manual **não realizado** nesta sessão (sem Postgres/Docker
  rodando no início; validado depois só via testes automatizados + typecheck/lint/build,
  sem subir o dashboard/app de verdade). Recomenda-se um teste manual
  ponta a ponta (criar fórmula com token novo, arrastar pra reordenar)
  antes de considerar 100% validado em uso real.
