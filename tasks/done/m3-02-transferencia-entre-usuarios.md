# M3-02 — Transferência entre usuários + contato confiável

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Spec, seção "Interações entre usuários — camada social (M3)" > "Transferência
entre usuários". Modelos já fechados no spec: `InterUserTransfer` e
`TrustedContact`. Diferente de uma transferência normal (M1, entre contas do
**mesmo** workspace) — aqui o destinatário é outro **usuário da
plataforma**, possivelmente em outro workspace que o remetente nunca vê.

## Escopo

### Backend
- `POST /transfers` — remetente aponta destinatário por telefone/e-mail de
  usuário existente na plataforma; nasce a transação de saída
  (`from_transaction_id`) imediatamente no workspace do remetente, e o
  registro `InterUserTransfer` com `status=pending`.
  - Segurança: se o telefone/e-mail não corresponde a usuário nenhum,
    resposta genérica (nunca confirmar/negar existência de conta — spec
    explícito).
  - Rate limit por remetente (mesmo padrão de `rate-limiter` já usado em
    login/OTP).
- `POST /transfers/:id/accept` — destinatário escolhe em qual conta/
  workspace dele a entrada cai; gera `to_transaction_id` (entrada),
  `status=accepted`. Opcionalmente marca o remetente como
  `TrustedContact` (`default_account_id` = a conta escolhida agora).
- `POST /transfers/:id/reject` — `status=rejected`, sem gerar transação de
  entrada.
- Expiração: job (BullMQ, reaproveita [[m2-01-infra-redis-bullmq]]) marca
  `status=expired` em transferências pendentes há mais de N dias (spec
  sugere 30) — expirar **não** afeta a transação de saída do remetente
  (ela já existe e fica).
- **Contato confiável**: se o remetente de uma nova transferência já é
  `TrustedContact` do destinatário, pular o aceite manual — gerar a
  entrada automaticamente na `default_account_id` (`status=accepted`
  direto, sem passar por `pending`).
- `GET /trusted-contacts` (listar), `DELETE /trusted-contacts/:id`
  (remover confiança).
- Notificação (reaproveita [[m2-10-notificacoes-push]], só soma um
  `notification_type` novo, ex.: `transfer_pending`/`transfer_accepted`) —
  destinatário só é notificado se **é** usuário da plataforma (nunca
  revela existência de conta pra quem não é).

### Mobile
- Tela "Enviar transferência" (destinatário por telefone/e-mail + valor +
  conta de origem).
- Tela "Transferências pendentes" (recebidas — aceitar com escolha de
  conta/workspace, ou recusar).
- Gestão de contatos confiáveis (listar, remover).
- Notificação → deep link pra tela de aceite.

## Dependências

[[m2-10-notificacoes-push]] (notificação), [[m2-01-infra-redis-bullmq]]
(job de expiração). Nenhuma dependência de [[m3-01-infra-storage-arquivos]]
nem de [[m3-03-split-despesas]] — pode ser feita em paralelo com ambas.

## Próximo passo

Decidir o prazo de expiração exato (spec sugere 30 dias, mas é
configurável) e se destinatário pode escolher **qual workspace** (não só
qual conta) receber, já que um usuário pode ter vários.
