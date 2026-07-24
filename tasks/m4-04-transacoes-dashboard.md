# M4-04 — Transações (listagem, filtros, criar/editar)

**Status:** 🔵 Backlog (não iniciada)

## Contexto

O uso diário do produto (`spec.md`: "Busca e filtros de transações... é o
uso diário do app"). Maior tela do dashboard em volume de UI. Backend
pronto e maduro (`apps/backend/src/http/modules/transaction/`) — inclui
parcelamento, recorrência, split, transferência, anexo, export CSV.

## Escopo

### Dashboard
- `routes/(app)/transactions/+page.svelte` — listagem com paginação,
  reaproveitando os mesmos filtros do app: texto, período, categoria,
  conta/cartão, membro (`GET /workspaces/:id/transactions` já suporta
  todos — ver query params em `http/modules/transaction/routes/list-transactions.ts`).
- `lib/components/transaction/transaction-filters.svelte`,
  `lib/components/transaction/transaction-row.svelte`,
  `lib/components/transaction/transaction-form.svelte` (criar/editar —
  inclui parcelamento e escolha de conta/cartão, mesma regra do
  `update-transaction.ts` sobre o que pode mudar em compra parcelada).
- `lib/components/transaction/attachment-field.svelte` — reaproveita as
  rotas de anexo (M3-04) já existentes (`POST`/`GET`/`DELETE
  .../transactions/:id/attachment`).
- `lib/components/transaction/split-badge.svelte` — indicador "Dividido"/
  fração, mesma info que o mobile expõe desde a task #69/#70.
- `routes/(app)/transactions/export/+server.ts` ou botão direto — reaproveita
  `GET .../export.csv` (M2-11, já faz gate owner/admin no backend).

## Dependências

M4-03 (precisa de contas/cartões/categorias existentes pra formulário de
transação fazer sentido).

## Critério de conclusão

Listar, filtrar, criar, editar e exportar transações funcionando ponta a
ponta contra o backend real, com paridade de filtros com o app mobile.
