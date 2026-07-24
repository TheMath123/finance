# M4-05 — Faturas por cartão + visão mensal

**Status:** 🔵 Backlog (não iniciada)

## Contexto

Duas telas de agregação (`spec.md`: "Tela de faturas por cartão... com
status e total" e "Visão mensal: receitas, despesas, saldo e disponível
projetado"). Backend pronto — `apps/backend/src/http/modules/summary/`
(inclui `variable-expense-estimate` do M2-08) e o módulo de fatura dentro
de `card`/`transaction`.

## Escopo

### Dashboard
- `routes/(app)/cards/[id]/invoices/+page.svelte` — faturas por mês de
  referência, status (aberta/fechada/paga), total.
- `routes/(app)/summary/+page.svelte` — dashboard mensal: saldo, receitas,
  despesas, **disponível projetado** pros próximos meses (fórmula em
  `spec.md`, "Previsão mensal" — já implementada em
  `apps/backend/src/application/use-cases/summary/monthly-summary.ts`).
- Gráficos: usar a skill `dataviz` deste projeto pra qualquer chart nesta
  tela (paleta/acessibilidade consistente) em vez de escolher uma lib e
  cores ad-hoc.

## Dependências

M4-04 (transações e cartões já navegáveis).

## Critério de conclusão

Fatura de um cartão específico e a visão mensal (com projeção) batendo
com os mesmos números que o app mobile mostra pro mesmo workspace.
