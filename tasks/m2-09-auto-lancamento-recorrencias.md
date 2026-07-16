# M2-09 — Auto-lançamento de recorrências (job BullMQ)

**Status:** 🟢 Concluída.

## Contexto

No M1, `RecurringTransaction` não gera transação sozinha — o app oferece
"confirmar com um toque" quando chega o `day_of_reference`
(`apps/mobile/.../explore.tsx`, `PendingOccurrenceRow` +
`recurringApi.confirmOccurrence`). O spec já registra o auto-lançamento via
job como melhoria explícita do M2 ("Auto-lançamento de recorrências no M1"
está em "Escopo negativo... entra no M2 com BullMQ").

## Decisão de produto (2026-07-16)

O auto-lançamento **substitui** a confirmação manual — é silencioso, não uma
preferência configurável por recorrência. Quando o dia chega, o job lança a
transação sozinho; o usuário vê na lista já confirmada (pode editar/excluir
depois, como qualquer transação) e recebe uma notificação avisando.

A tela/rota de confirmação manual (`PendingOccurrenceRow`,
`list-pending-occurrences`, `confirm-occurrence` HTTP) **não foi removida** —
fica como fallback inofensivo pro intervalo entre a criação de uma
recorrência e a próxima execução do sweep no mesmo dia (o worker roda no
boot + a cada 24h). `confirmOccurrence` já responde
`occurrence_already_confirmed` de forma graciosa se o job já tiver lançado
antes do toque manual.

## Implementação

- `apps/backend/src/application/use-cases/notification/sweep.ts`:
  `sweepRecurringPending` virou `sweepRecurringAutoLaunch` — pra cada regra
  ativa com ocorrência prevista hoje e ainda não confirmada, chama
  `confirmOccurrence` (reaproveitando toda a lógica de crédito/fatura/
  parcelas já existente) com um ator sintético — o `owner` do workspace (ou
  o primeiro membro) só pra preencher `createdBy`/auditoria, já que o job não
  tem um usuário autenticado. Só notifica os membros (`recurring_pending`,
  copy "Recorrência lançada") se o lançamento deu certo; se falhar (ex.:
  fatura já paga), não notifica um lançamento que não aconteceu.
- `createTransaction`/`confirmOccurrence` tiveram a assinatura estreitada de
  `UseCaseDeps` completo para `Pick<UseCaseDeps, "repos" | "uow">` — é tudo
  que usam, e isso permite chamar os dois a partir do sweep (que não tem
  `hasher`/`tokens`/`logger`/`rateLimiter` do processo HTTP).
- `apps/backend/src/main/worker.ts`: monta `uow` (`createUnitOfWork`) junto
  do `repos`/`dispatch` que já existiam pro sweep.
- Idempotência: dupla checagem — `confirmedOccurrenceKeys` (bulk, evita
  chamar `confirmOccurrence` à toa) e o próprio `confirmOccurrence` via
  `findByRecurringAndDate` antes de criar.
- Testes: `notification.test.ts` — cenário atualizado pra criar conta/banco
  reais (método `pix`, não mais `credit` com `cardId: null`, que sempre
  falharia em `createTransaction`) e agora afirma que a transação foi
  criada, não só a notificação; roda o sweep duas vezes pra confirmar que
  não duplica.

## Dependências

[[m2-01-infra-redis-bullmq]] (precisava do worker/scheduler existir
primeiro — já concluída).
