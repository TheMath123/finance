# M4-04 — Transações (listagem, filtros, criar/editar)

**Status:** 🟢 Concluída (2026-07-24) — validada pelo usuário no browser ao
longo de várias rodadas de ajuste (tabela reordenada, ícone/logo de marca
na categoria, botões ghost, abas Ativas/Arquivadas, bug do filtro de
arquivadas, responsividade mobile do shell e dos filtros).

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
- **Ícone de categoria por Phosphor**: revertido o adiamento inicial a
  pedido do usuário. `lib/category-icon.ts` replica
  `resolveCategoryIcon` do mobile — descoberta em cima da hora: o
  `phosphor-svelte` **também** reexporta todo o pacote pelo índice
  principal (`import * as PhosphorIcons from 'phosphor-svelte'`),
  então dá pra indexar por string em runtime exatamente como o pacote
  React do mobile faz — não precisou de loader dinâmico nenhum. Mesmo
  trade-off aceito lá (sem tree-shaking, pacote inteiro no bundle) —
  ok pra um dashboard atrás de login.
- **Logo de marca (Fase 3 do thesvg.org, pedida pelo usuário pra
  substituir o ícone quando a descrição bate com uma marca conhecida)**:
  **implementada**. `WebFetch` não conseguia ver o HTML real do thesvg.org
  (SPA em Next.js, HTML inicial só mostra "Loading..."), mas `curl` direto
  revelou o padrão: `https://thesvg.org/icons/{slug}/default.svg`
  (`Content-Type: image/svg+xml`), confirmado contra ~24 marcas (netflix,
  spotify, uber, uber-eats, ifood, amazon, aliexpress, nubank, shopee,
  steam, playstation, xbox, disney-plus, hbo-max, whatsapp, telegram,
  youtube, picpay, itau, bradesco, santander, zoom — todas 200). `lib/
  merchant-logo.ts` (`getMerchantLogoUrl`) faz o match por palavra-chave,
  case-insensitive, ordenado por tamanho de keyword (evita "uber" comer
  "uber eats"). Na tabela: `<img>` no lugar do `<CategoryIcon>` quando há
  match, com `onerror` marcando o id num `SvelteSet` reativo (`failedLogos`)
  pra cair de volta no ícone — fallback garantido, nunca quebra a linha.
  Mesma lista replicada no app mobile de carona (ver
  [[ui-novo-padrao-figma]], Fase 3 fechada na mesma sessão) — os dois
  arquivos `merchant-logo.ts` ficam em sync manual por ora, sem
  justificativa ainda pra extrair pra um pacote compartilhado.

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
  filtros do app (texto, período, categoria, conta, cartão).
- **Bug real encontrado e corrigido**: o filtro de arquivadas nunca
  funcionava. `z.coerce.boolean()` no schema do backend
  (`listTransactionsSchema`) trata **qualquer string não-vazia** como
  `true` — inclusive a string `"false"` — e o client sempre mandava
  `deletedOnly=false` explicitamente quando o checkbox estava
  desmarcado. `transaction-api.ts` agora omite o parâmetro inteiro
  quando o valor é `false` (só envia quando `true`).
- **Tabela redesenhada a pedido do usuário** (três rodadas de feedback):
  virou `<table>` de verdade (era lista de linhas com divisor, como o
  resto do M4) — mais fácil de escanear numa tela densa. Colunas na
  ordem pedida: **Data, Categoria (ícone+nome), Descrição, Origem,
  Valor, Ações**. Ações viraram botões **ghost, só ícone**
  (`variant="ghost" size="icon-sm"`, com `title`/`aria-label` pra
  acessibilidade) em vez de botões com texto: Editar (`PencilSimpleIcon`)
  e Arquivar (`ArchiveIcon`) na visão normal.
- **"Excluídas" virou "Arquivadas" numa aba própria**: em vez do
  checkbox "Ver excluídas" (que também escondia o bug acima), agora tem
  duas abas-pílula **Ativas/Arquivadas** que trocam a listagem inteira
  (nunca mistura os dois conjuntos — mesmo padrão de abas do resto do
  dashboard). Na aba Arquivadas: banner explicando que a transação não
  entra em nenhum resumo, badge "Arquivada" em cada linha, e a única
  ação é Restaurar (`ArrowCounterClockwiseIcon`, ghost). Backend
  continua o mesmo par soft-delete/restore de sempre — só a UI ficou
  mais honesta sobre o que a ação realmente faz.
- **Dialog de criar** com campos condicionais por método (`bind:value`
  no select de método controla se aparece conta única, cartão+parcelas,
  ou conta origem/destino) — mesma árvore de regras do backend.
- **Dialog de editar** trava valor/data/cartão quando a transação tem
  `installmentGroupId` (regra do backend: `installment_field_locked`) —
  os inputs ficam `disabled` e a mensagem já avisa antes de tentar
  submeter.
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
