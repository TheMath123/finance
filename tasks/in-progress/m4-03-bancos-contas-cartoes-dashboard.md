# M4-03 — CRUD de bancos, contas e cartões

**Status:** 🟡 Em andamento — código completo (lint, typecheck e build de
produção limpos); falta a validação manual do usuário no browser.

## Contexto

Primeira tela de dado financeiro de verdade do dashboard (`spec.md`,
"Telas de CRUD para bancos, contas, cartões e transações"). Backend
pronto (`apps/backend/src/http/modules/bank/`, `.../account/`,
`.../card/`) — só frontend.

## Escopo

### Dashboard
- `routes/(app)/banks/+page.svelte` + `lib/components/bank/bank-form.svelte`
  (dialog Bits UI) — CRUD de bancos.
- `routes/(app)/accounts/+page.svelte` + `lib/components/account/account-form.svelte`
  — CRUD de contas (vinculadas a um banco).
- `routes/(app)/cards/+page.svelte` + `lib/components/card/card-form.svelte`
  — CRUD de cartões (vinculados a uma conta, dia de fechamento/vencimento).
- `lib/schemas/bank.ts`, `lib/schemas/account.ts`, `lib/schemas/card.ts` —
  Zod schema por entidade, espelhando a validação que já existe no backend
  (`http/modules/*/schemas.ts`) — nunca reinventar a regra, só replicar
  pro form dar feedback antes do submit.

## Dependências

M4-02 (layout + contexto de workspace ativo).

## Implementação (2026-07-24)

Desvios conscientes do escopo original:
- **Sem dialog/form em componente separado**: em vez de modal Bits UI, cada
  página usa form de criação no topo + **edição inline** na própria linha
  (`?edit=<id>` na URL — SSR-friendly, funciona sem JS, mantém o padrão de
  actions server-side do spec). Campos repetidos entre criar/editar viraram
  `{#snippet}` do Svelte 5 dentro da própria página (accounts/cards) —
  menos indireção que arquivo separado enquanto só uma tela usa.
- **Um `lib/schemas/finance.ts` só** (três schemas espelhados juntos) em vez
  de três arquivos — mesma granularidade do `lib/schemas/auth.ts`.

O que existe:
- `lib/server/{bank,account,card}-api.ts` — clients server-only espelhando
  os contratos reais (`Bank`, `AccountWithBalance` — saldo derivado no
  backend —, `CardWithLimit` — limite disponível derivado), incluindo
  archive/delete além do CRUD.
- `lib/money.ts` — `formatCents` (BRL) e `parseReaisToCents` (input
  "1.234,56" → centavos; regra do spec: dinheiro é sempre centavos).
- Catálogo de bancos direto de `@finance/shared` (`BANK_CATALOG`/`getBank`)
  — select de banco por `bankCode` + bolinha com a cor da marca, sem
  duplicar a lista.
- Sidebar ganhou Bancos, Contas e Cartões (Phosphor: Bank/Wallet/CreditCard).
- Gate por papel: forms/ações só pra owner/admin (o mínimo do backend é
  `admin`); viewer/member veem listagem com saldo/limite.

Verificado: lint (Biome + Prettier/ESLint), `svelte-check` e build de
produção limpos.

## Critério de conclusão

CRUD completo das três entidades funcionando contra o backend real,
respeitando o papel do usuário no workspace (viewer sem botão de
criar/editar/excluir).
