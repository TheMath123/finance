# M3-03 — Split de despesas

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Spec, seção "Interações entre usuários — camada social (M3)" > "Split de
despesas". Modelos já fechados: `ExpenseSplit` (a despesa cheia original)
e `SplitShare` (a parte de cada participante). Ex.: A paga o restaurante e
racha com 2 amigos.

## Escopo

### Backend
- `POST /transactions/:id/split` — cria `ExpenseSplit` pra uma transação
  de despesa existente + N `SplitShare` (divisão igual automática ou
  valores manuais, validando que a soma das partes bate com o total da
  transação).
- Participante pode ser:
  - **Usuário da plataforma** (`participant_user_id`) — recebe
    notificação, a parte aparece como pendência **no workspace dele**.
  - **Externo por nome** (`participant_name`) — só controle manual do
    criador do split, sem conta nenhuma envolvida.
- Confirmação em dois lados (só participante-usuário):
  1. Participante marca "paguei" → `SplitShare.status = paid`.
  2. Criador confirma "recebi" → `status = confirmed` + gera
     `reimbursement_transaction_id` (entrada/reembolso pro criador,
     vinculada ao split).
  - Participante externo: criador marca o recebimento direto
    (`paid` → `confirmed` num só passo, sem o participante "confirmar"
    nada porque não tem conta).
- Relatórios/resumo: o reembolso confirmado abate a despesa original nos
  agregados do criador (despesa líquida = parte dele só) — checar se
  `monthlySummary`/`expenseByCategory` ([[m2-08-ia-previsao-gastos]])
  precisam soma explícita do reembolso, ou se já funciona por ser uma
  transação de `income` normal vinculada.
- Notificação (`split_payment_pending`, `split_reimbursement_confirmed`),
  reaproveita [[m2-10-notificacoes-push]].

### Mobile
- Botão "Dividir" na tela de detalhe/edição de uma transação de despesa.
- Formulário do split: adicionar participantes (buscar usuário da
  plataforma por telefone/e-mail, ou digitar nome de participante
  externo), divisão igual (default) ou editar valores manualmente.
- Tela "Splits pendentes" (o que eu devo, o que me devem) — ação de
  marcar "paguei" (participante) / "recebi" (criador).

## Dependências

[[m2-10-notificacoes-push]] (notificação). Nenhuma dependência de
[[m3-01-infra-storage-arquivos]] nem de [[m3-02-transferencia-entre-usuarios]]
— pode ser feita em paralelo com ambas.

## Próximo passo

Decidir se dá pra editar/cancelar um split depois de criado (e o que
acontece com partes já pagas/confirmadas nesse caso) — spec não cobre
esse caso de borda.
