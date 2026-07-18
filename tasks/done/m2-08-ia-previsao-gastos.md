# M2-08 — Previsão de gastos variáveis

**Status:** 🟢 Concluída.

## Contexto

O M1 já entrega a previsão **determinística** (recorrências + parcelas
futuras). O spec reserva a previsão de **gastos variáveis por categoria**
(mercado, lazer, etc. — o que não é recorrência nem parcela) com histórico
como base (seção "Previsão e IA").

**Decisão (2026-07-18):** o "fallback determinístico (média histórica)" que
o spec já previa pra esse guardrail acabou sendo a estratégia inteira — não
tem parte de IA aqui. Média histórica é exatamente o que já é determinístico,
auditável e sem custo de token; não tem porque colocar uma chamada de IA no
meio de uma conta que já é uma média. O nome da task ficou "de IA" no spec,
mas a implementação é 100% determinística (nenhuma chamada a
`infra/ai` — o pipeline de IA de [[m2-07-ia-pipeline-transacoes]] continua
intacto e sem relação com isso).

## Implementação

### Cálculo
- `packages/db`: nenhuma migration nova — reaproveita `installment_group_id`
  e `recurring_id`, já existentes em `transactions`.
- `application/ports/transaction-repository.ts` +
  `infra/db/repositories/transaction.repository.ts` —
  `variableExpenseByCategory(workspaceId, from, to)`: igual a
  `expenseByCategory`, mas com `installment_group_id IS NULL AND
  recurring_id IS NULL` (só o que é de fato variável).
- `application/use-cases/summary/estimate-variable-expense.ts` —
  `estimateVariableExpense`: soma por categoria dos últimos 3 meses
  **completos** (mês corrente fica de fora, ainda em andamento) ÷ 3 =
  média mensal. Granularidade só por categoria (decisão do usuário
  2026-07-18) — o resumo mensal soma tudo num número só.

### Cache
- `application/ports/cache.ts` (novo port genérico, get/set com TTL) +
  `infra/cache/redis-cache.ts` (produção, JSON via ioredis) +
  `infra/cache/in-memory-cache.ts` (testes). Decisão do usuário: sob
  demanda (não job agendado) com cache curto — TTL de 6h, chave por
  workspace (`variable-expense-estimate:{workspaceId}`). Evita recalcular
  a cada abertura da tela de Resumo sem precisar de infra de job novo.
- Query validada com `EXPLAIN ANALYZE` contra 500 mil transações
  sintéticas num único workspace (teste transacional, `ROLLBACK` no final,
  nada ficou no banco): usa o índice já existente
  `transactions_workspace_date_idx` (`workspace_id, date`) via *Bitmap
  Index Scan*, ~27ms — não precisou de índice novo. Com o cache de 6h,
  essa query roda no máximo uma vez a cada 6h por workspace.

### Integração no disponível projetado
- `application/use-cases/summary/monthly-summary.ts` — `projectedAvailable`
  agora também subtrai a estimativa de gasto variável, **escalada pela
  fração de dias que ainda faltam no mês** (o que já foi gasto no mês
  corrente já está refletido em `totalBalance`; subtrair o mês inteiro
  dobraria a conta). Mês inteiramente futuro conta 100% da estimativa; mês
  corrente conta só a fração de dias restantes.

### API
- `GET /workspaces/:workspaceId/summary/variable-expense-estimate` — rota
  nova, devolve o breakdown por categoria (`byCategory` + `total`). Não
  tem `year`/`month`: é sempre a mesma janela móvel de 3 meses. Pensada
  pra alimentar uma **tela separada** no app (decisão do usuário
  2026-07-18) — o resumo mensal (`GET .../summary`) só usa o `total` pra
  entrar no `projectedAvailable`.
### Mobile
- `app/(app)/variable-expense.tsx` — tela separada com o total estimado no
  topo + breakdown por categoria (cor + nome + valor), decisão do usuário
  (2026-07-18) de não misturar isso no resumo mensal.
- Entrada de navegação na aba "Mais" (`(tabs)/accounts.tsx`), entre
  Categorias e Workspaces.
- `lib/summary-api.ts` — `summaryApi.getVariableExpenseEstimate`.

## Testes

`estimate-variable-expense.test.ts` (contra Postgres): workspace sem
histórico → zero; média correta ignorando parcela e recorrência
(`installment_group_id`/`recurring_id` populados de propósito no teste);
cache — segunda chamada não recalcula mesmo com lançamento novo no meio.
`in-memory-cache.test.ts`: get/set/expiração de TTL. Typecheck do mobile
limpo; tela validada via smoke test do bundle web (sem erro de runtime),
não visualmente numa sessão autenticada real (sem tool de browser neste
ambiente). 106/106 testes da suíte do backend passando, typecheck limpo.

## Dependências

Nenhuma — a suposição inicial (reaproveitar a infra de
[[m2-07-ia-pipeline-transacoes]]) não se confirmou, já que a implementação
final não usa IA nenhuma.
