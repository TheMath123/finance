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
- `routes/(app)/more/banks/+page.svelte` (dialog shadcn-svelte/Bits UI) —
  CRUD de bancos.
- `routes/(app)/more/accounts/+page.svelte` — CRUD de contas (vinculadas a
  um banco).
- `routes/(app)/more/cards/+page.svelte` — CRUD de cartões (vinculados a
  um banco, dia de fechamento/vencimento).
- `lib/schemas/finance.ts` — Zod schema por entidade, espelhando a
  validação que já existe no backend (`http/modules/*/schemas.ts`) —
  nunca reinventar a regra, só replicar pro form dar feedback antes do
  submit.

## Dependências

M4-02 (layout + contexto de workspace ativo).

## Implementação (2026-07-24)

Retrabalhado duas vezes após feedback do usuário, na sessão:
1. Primeira versão: form de criação no topo + edição inline na própria
   linha (`?edit=<id>` na URL). Bancos, Contas e Cartões como itens
   próprios na sidebar.
2. **Feedback**: "como no app, bancos/contas/cartões vão pra aba de Mais" →
   as três telas viraram `routes/(app)/more/{banks,accounts,cards}/`, com
   `routes/(app)/more/+layout.svelte` como hub de abas-pílula (mesmo padrão
   do hub `/workspace` do M4-02), espelhando a aba "Mais" do app mobile.
   Sidebar perdeu os três itens e ganhou um único "Mais" (ícone
   `SquaresFour`). `/more` redireciona pra `/more/accounts` (ordem do app).
3. **Feedback**: "adicionar/editar deve abrir um dialog" → trocado o form
   inline por `Dialog.Root` do shadcn-svelte/Bits UI (`bunx shadcn-svelte
   add dialog`) — um dialog de criação (botão no topo da lista) e um de
   edição (estado local `editing` guarda a entidade clicada). `use:enhance`
   fecha o dialog só quando a action responde `success` (erro mantém o
   dialog aberto com a mensagem).

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
- Um `lib/schemas/finance.ts` só (três schemas espelhados juntos) — mesma
  granularidade do `lib/schemas/auth.ts`.
- Campos repetidos entre criar/editar viraram `{#snippet}` do Svelte 5
  dentro da própria página — menos indireção que componente separado
  enquanto só uma tela usa.
- Gate por papel: forms/ações só pra owner/admin (o mínimo do backend é
  `admin`); viewer/member veem listagem com saldo/limite, sem botão de
  adicionar/editar/arquivar/excluir.

Verificado: lint (Biome + Prettier/ESLint), `svelte-check` e build de
produção limpos.

## Critério de conclusão

CRUD completo das três entidades funcionando contra o backend real,
respeitando o papel do usuário no workspace (viewer sem botão de
criar/editar/excluir).
