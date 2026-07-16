# M2-10 — Notificações push

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Spec (Milestones, M2): "notificações push (fatura fechou/vence, recorrência a
confirmar)".

## Escopo

### Backend
- Registro de push token do device (`expo-push-token`) por usuário — novo
  campo/tabela.
- Disparo via job BullMQ (depende de [[m2-01-infra-redis-bullmq]]):
  - Fatura fechou (quando o job de fechamento — ver competência calculada na
    leitura hoje, M2 pode fixar isso em job — detecta a transição).
  - Fatura vence em N dias.
  - Recorrência pendente de confirmação (se a decisão de
    [[m2-09-auto-lancamento-recorrencias]] for manter a confirmação manual
    como opção).
- Usar Expo Push Notification service (`expo-server-sdk`).

### Mobile
- Pedir permissão de notificação, registrar o push token no backend.
- Deep link da notificação pra tela relevante (fatura do cartão / tela de
  recorrências).

## Dependências

[[m2-01-infra-redis-bullmq]] (jobs agendados). Pode ser feita em paralelo com
[[m2-09-auto-lancamento-recorrencias]] (compartilham o mesmo scheduler diário).

## Próximo passo

Configurar o projeto no Expo (push notification credentials) antes de
escrever código de envio.
