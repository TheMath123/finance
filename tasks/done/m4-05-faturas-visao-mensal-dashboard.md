# M4-05 — Faturas por cartão + visão mensal

**Status:** 🟢 Concluída (2026-07-24).

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

## Implementação (2026-07-24)

Um desvio consciente do escopo original:
- **Sem rota `/summary` separada** — a visão mensal virou o conteúdo da
  própria Home (`routes/(app)/+page.svelte` + novo `+page.server.ts`),
  substituindo o placeholder. Motivo: é exatamente assim que o app mobile
  organiza a informação (saldo/projeção na Home, sem aba própria), e criar
  uma 5ª aba na barra de navegação mobile (que já tem Início/Transações/
  Mais/Workspace) pioraria justamente o problema de responsividade
  resolvido a rodada anterior. `lib/month-names.ts` extraído (evita
  duplicar o array de 12 nomes entre Home e faturas).

O que existe:
- `lib/server/summary-api.ts` (`getMonthlySummary`) e `lib/server/
  invoice-api.ts` (`listInvoices`, `payInvoice`) — espelham os contratos
  reais (`MonthlySummary`/`CategorySummary` de `monthly-summary.ts`,
  `InvoiceView` de `list-invoices.ts`).
- **Home**: navegação de mês (‹ Mês/Ano ›) via query params `year`/`month`
  na própria URL (SSR puro); 4 stat tiles (saldo, receitas, despesas,
  disponível projetado — `—` quando `null`, ou seja mês encerrado, regra
  do backend); tabela "Despesas por categoria" onde a barra é decoração
  *dentro* da célula de valor — a tabela em si já é a "table view"
  acessível da skill `dataviz`, sem precisar de toggle gráfico/tabela
  separado. Cor de cada barra vem do `category.color` já cadastrado (não
  uma paleta nova/gerada — identity encoding já é dado do domínio); texto
  de valor em token neutro (`tabular-nums`), nunca na cor da série,
  conforme a skill.
- **Faturas** (`routes/(app)/more/cards/[cardId]/invoices/`): lista por
  competência (mês/ano), status efetivo (aberta/fechada/paga — o backend
  já recalcula e persiste a transição na primeira leitura), total; botão
  "Faturas" adicionado em cada linha de `/more/cards`. Dialog de pagamento
  (conta, data, método pix/débito) só aparece pra fatura não-paga com
  total > 0 (fatura vazia não tem o que pagar — mesma regra do backend,
  `invoice_empty`).
- Gate por papel: pagar fatura é `member`+ no backend (mesmo nível de
  criar/editar transação); listar é `viewer`+.

Verificado: lint (Biome + Prettier/ESLint), `svelte-check`, build de
produção e boot do dev server (smoke test) limpos.

## Critério de conclusão

Fatura de um cartão específico e a visão mensal (com projeção) batendo
com os mesmos números que o app mobile mostra pro mesmo workspace.
