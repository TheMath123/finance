# M4-03 — CRUD de bancos, contas e cartões

**Status:** 🔵 Backlog (não iniciada)

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

## Critério de conclusão

CRUD completo das três entidades funcionando contra o backend real,
respeitando o papel do usuário no workspace (viewer sem botão de
criar/editar/excluir).
