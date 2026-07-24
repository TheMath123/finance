# M4-04 — Transações (listagem, filtros, criar/editar)

**Status:** 🟡 Em andamento — código completo (lint, typecheck e build de
produção limpos); falta a validação manual do usuário no browser.

## Contexto

O uso diário do produto (`spec.md`: "Busca e filtros de transações... é o
uso diário do app"). Maior tela do dashboard em volume de UI. Backend
pronto e maduro (`apps/backend/src/http/modules/transaction/`) — inclui
parcelamento, recorrência, split, transferência, anexo, export CSV.

## Escopo

### Dashboard
- `routes/(app)/transactions/+page.svelte` — listagem com paginação,
  reaproveitando os mesmos filtros do app: texto, período, categoria,
  conta/cartão (`GET /workspaces/:id/transactions` já suporta todos —
  ver query params em `http/modules/transaction/routes/list-transactions.ts`).
  Dialog de criar/editar — inclui parcelamento e escolha de conta/cartão,
  mesma regra do `update-transaction.ts` sobre o que pode mudar em compra
  parcelada. Indicador "Dividido"/fração de parcela inline na linha,
  mesma info que o mobile expõe desde a task #69/#70. Anexo de
  comprovante fica pra depois (ver "Implementação").
- `routes/(app)/transactions/export/+server.ts` — reaproveita
  `GET .../export.csv` (M2-11, já faz gate owner/admin no backend).

## Dependências

M4-03 (precisa de contas/cartões/categorias existentes pra formulário de
transação fazer sentido).

## Implementação (2026-07-24)

Escopo ajustado (consistente com as duas rodadas de feedback do M4-03—
dialog em vez de form inline/página separada):
- **Sem componentes separados** (`transaction-filters.svelte`,
  `transaction-row.svelte`, `transaction-form.svelte`) — tudo em
  `routes/(app)/transactions/+page.svelte`, como as demais telas do M4.
  `lib/transaction-labels.ts` extrai só a lógica não-visual reaproveitável
  (`transactionSourceLabel`, `formatTransactionDate` — mesma regra do
  `explore.tsx` do app: prioriza nome do cartão/conta, cai no método
  genérico).
- **Anexo de comprovante (`attachment-field`) adiado**: upload/preview de
  comprovante é uma frente própria (multipart, preview de imagem) que não
  bloqueia listar/filtrar/criar/editar/exportar — registrado aqui como
  gap consciente, não esquecimento. Fast-follow natural quando alguém
  pedir.
- **Ícone de categoria por Phosphor também adiado**: a listagem usa a
  **cor da categoria** (`category.color`, já existe na entidade) num
  dot, mesmo padrão do dot de banco no M4-03, em vez de resolver
  dinamicamente o ícone Phosphor a partir do slug (`category.icon`) como
  o app mobile faz (`resolveCategoryIcon`) — replicar isso no Svelte
  exigiria um loader dinâmico de ~1300 ícones (`phosphor-svelte` expõe
  cada ícone como arquivo `.svelte` próprio, sem objeto indexável como
  o pacote React), custo desproporcional ao ganho visual nesta rodada.

O que existe:
- `lib/server/transaction-api.ts` — `listTransactions` (filtros
  `q/from/to/categoryId/accountId/cardId/deletedOnly`, como o backend),
  `createTransaction`, `updateTransaction`, `deleteTransaction`
  (soft-delete), `restoreTransaction`.
- `lib/server/category-api.ts` — `listCategories`.
- `lib/schemas/transaction.ts` — schema de criação com `.refine()`
  condicional por método (transfer exige conta origem≠destino; credit
  exige cartão; pix/debit/cash exigem conta) espelhando exatamente a
  árvore de regras de `create-transaction.ts`; schema de edição à parte
  (campos menores, sem `type`/`method`, que não são editáveis).
- `lib/server/api-client.ts` ganhou `apiRequestRaw` — variante que
  devolve a `Response` crua (não assume JSON), usada só pelo export CSV.
- **Filtros via GET puro** (`<form method="GET">`, sem JS) — a URL vira a
  fonte da verdade dos filtros, SSR re-executa a query; paridade com os
  filtros do app (texto, período, categoria, conta, cartão) + toggle
  "Ver excluídas" (`deletedOnly`).
- **Dialog de criar** com campos condicionais por método (`bind:value`
  no select de método controla se aparece conta única, cartão+parcelas,
  ou conta origem/destino) — mesma árvore de regras do backend.
- **Dialog de editar** trava valor/data/cartão quando a transação tem
  `installmentGroupId` (regra do backend: `installment_field_locked`) —
  os inputs ficam `disabled` e a mensagem já avisa antes de tentar
  submeter.
- Excluir é soft-delete (`?/remove`) com botão "Restaurar" (`?/restore`)
  quando `deletedOnly=true` está na URL — espelha exatamente o par
  `deleteTransaction`/`restoreTransaction` do backend.
- `routes/(app)/transactions/export/+server.ts` — proxy do
  `GET .../export.csv` (gate `admin`/`owner` já é do backend); repassa
  o header `Content-Disposition` pro browser baixar direto, sem o client
  nunca falar com o backend.
- Sidebar ganhou "Transações" (ícone `Receipt`).
- Gate por papel: `canManage = role !== 'viewer'` (create/update é
  `member`+ no backend); viewer só lista/filtra/exporta.

Verificado: lint (Biome + Prettier/ESLint), `svelte-check` e build de
produção limpos.

## Critério de conclusão

Listar, filtrar, criar, editar e exportar transações funcionando ponta a
ponta contra o backend real, com paridade de filtros com o app mobile.
