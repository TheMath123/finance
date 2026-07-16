# M2-09 — Auto-lançamento de recorrências (job BullMQ)

**Status:** 🔵 Backlog — não iniciada.

## Contexto

No M1, `RecurringTransaction` não gera transação sozinha — o app oferece
"confirmar com um toque" quando chega o `day_of_reference`
(`apps/mobile/.../explore.tsx`, `PendingOccurrenceRow` +
`recurringApi.confirmOccurrence`). O spec já registra o auto-lançamento via
job como melhoria explícita do M2 ("Auto-lançamento de recorrências no M1"
está em "Escopo negativo... entra no M2 com BullMQ").

## Escopo

- Job BullMQ agendado (diário) que percorre `RecurringTransaction.active` e,
  ao chegar o `day_of_reference` (ou `month_of_reference`+dia, no caso
  `yearly`), materializa a transação automaticamente — mesma lógica de
  `confirm-occurrence.ts`, só que disparada pelo worker em vez de um toque do
  usuário.
- Decisão de produto a fechar: o auto-lançamento **substitui** a confirmação
  manual (silencioso) ou só faz o que hoje é manual continuar existindo como
  fallback/preferência configurável por `RecurringTransaction`? O spec não
  detalha — alinhar antes de implementar (mesmo estilo da decisão registrada
  na antiga task de onboarding).
- Idempotência: job não pode duplicar lançamento se rodar mais de uma vez no
  mesmo dia (checar se já existe transação com aquele `recurring_id` no
  período antes de criar).

## Dependências

[[m2-01-infra-redis-bullmq]] (precisa do worker/scheduler existir primeiro).

## Próximo passo

Alinhar a decisão de produto (silencioso vs. confirmação) antes de escrever o
job — evita implementar o comportamento errado.
