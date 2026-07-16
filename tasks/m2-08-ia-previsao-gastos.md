# M2-08 — IA de previsão de gastos variáveis

**Status:** 🔵 Backlog — não iniciada.

## Contexto

O M1 já entrega a previsão **determinística** (recorrências + parcelas
futuras). O spec reserva a previsão de **gastos variáveis por categoria**
(mercado, lazer, etc. — o que não é recorrência nem parcela) pra IA, com
histórico como base (seção "Previsão e IA").

## Escopo

- Serviço que estima gasto variável do próximo mês por categoria, a partir do
  histórico de transações do workspace.
- Integra no cálculo de "disponível projetado" (`packages/db`/backend já
  calcula `saldos + receitas recorrentes − parcelas futuras − despesas
  recorrentes`; falta somar `− estimativa de gastos variáveis`).
- Fallback determinístico: média histórica por categoria quando a IA estiver
  indisponível ou o orçamento de tokens estourar (mesmo guardrail de
  [[m2-07-ia-pipeline-transacoes]]).
- Cache/memoização — não vale recalcular a cada request da tela de Resumo.

## Dependências

Reaproveita a infraestrutura de IA de [[m2-07-ia-pipeline-transacoes]]
(guardrails de tokens, fallback). Faz sentido implementar depois, já com o
pipeline de categorização gerando histórico categorizado de verdade.

## Próximo passo

Definir a granularidade da estimativa (por categoria só, ou também por
conta/cartão) e decidir se roda sob demanda (na consulta do resumo mensal) ou
em job agendado (BullMQ) que pré-calcula uma vez por dia.
