# M3-03 — Split de despesas

**Status:** 🟢 Concluída (2026-07-19) — backend validado com testes de
integração reais contra Postgres; mobile typecheck limpo e ligado a rotas
reais. Mesma ressalva do M3-02: sem clique manual num app rodando.

## Contexto

Spec, seção "Interações entre usuários — camada social (M3)" > "Split de
despesas". Modelos já fechados: `ExpenseSplit` (a despesa cheia original)
e `SplitShare` (a parte de cada participante). Ex.: A paga o restaurante e
racha com 2 amigos.

**Decisão de produto (2026-07-19):** split criado é editável só no sentido
de **cancelamento** — e só enquanto nenhuma parte foi paga/confirmada
(soft-cancel via `cancelled_at`, nunca mexe na transação original). Editar
valores/participantes depois de criado não é suportado nesta task — se
errou, cancela (se ainda der) e recria.

## Escopo

### Backend
- `POST /workspaces/:workspaceId/transactions/:transactionId/split` —
  cria `ExpenseSplit` pra uma transação de despesa existente (precisa ter
  `accountId` — método `credit` fica fora de escopo, sem modelagem de
  estorno em fatura) + N `SplitShare` (divisão igual automática — total
  dividido entre criador + participantes, resto de centavos fica com o
  criador — ou valores manuais, validando que a soma das partes **não
  passa** do total; pode ser igual ao total, criador fica sem parte).
- `POST /splits/:id/cancel` — só o criador, só se nenhuma parte saiu de
  `pending`.
- Participante pode ser:
  - **Usuário da plataforma** (`participant_user_id`, resolvido por
    telefone/e-mail) — recebe notificação `split_payment_pending`.
  - **Externo por nome** (`participant_name`) — só controle manual do
    criador do split, sem conta nenhuma envolvida.
- Confirmação em dois lados (só participante-usuário):
  1. `POST /split-shares/:id/paid` — só o próprio participante, só a
     partir de `pending` → `paid`.
  2. `POST /split-shares/:id/confirm` — só o criador; participante-usuário
     precisa estar `paid` antes, participante externo pula direto de
     `pending` pra `confirmed` (sem conta pra marcar "paguei"). Gera a
     transação de reembolso (entrada, `method=pix`, mesma conta da
     despesa original) e notifica `split_reimbursement_confirmed`.
- `GET /splits/owed-by-me` / `GET /splits/owed-to-me` — não estavam no
  rascunho original da task, mas o app precisa pra montar a tela de
  "Splits pendentes".
- Relatórios/resumo: **confirmado que não precisa de nenhuma soma
  explícita** — o reembolso é uma transação de `income` normal (mesma
  categoria fallback do workspace), então `monthlySummary`/
  `expenseByCategory` ([[m2-08-ia-previsao-gastos]]) já refletem a
  despesa líquida automaticamente (despesa cheia continua contada +
  reembolso soma do lado da receita), sem código novo nos agregados.
- Notificação (`split_payment_pending`, `split_reimbursement_confirmed`),
  reaproveita [[m2-10-notificacoes-push]].

### Mobile
- Botão "Dividir com outras pessoas" dentro do form de editar transação
  (`EditTransactionForm`) — só aparece pra despesa com conta de origem.
- Formulário do split (`CreateSplitForm`): adicionar participantes
  (usuário da plataforma por telefone/e-mail, ou nome de externo),
  divisão igual (default, checkbox) ou valor manual por participante.
- Tela "Splits pendentes" (`/splits`) — duas abas: "o que eu devo" (marcar
  "paguei") e "o que me devem" (confirmar recebimento).

## Dependências

[[m2-10-notificacoes-push]] (notificação). Nenhuma dependência de
[[m3-01-infra-storage-arquivos]] nem de [[m3-02-transferencia-entre-usuarios]]
— feita em paralelo com ambas, como previsto.

## Implementação

- **Schema**: `packages/db/src/schema/expense-split.ts` —
  `splitShareStatusEnum` (pending/paid/confirmed), tabela
  `expense_splits` (com `cancelled_at` nullable) e `split_shares`
  (`participant_user_id`/`participant_name` mutuamente exclusivos, XOR
  validado na aplicação, não no banco — mesmo padrão de `accountId`/
  `cardId` em `transactions`). `notificationTypeEnum` ganhou
  `split_payment_pending`/`split_reimbursement_confirmed`. Migration
  `0011_shallow_nick_fury.sql`.
- **Repositórios**: `expense-split.repository.ts`,
  `split-share.repository.ts` (com `listOwedByUser`/`listOwedToCreator`
  via join `splitShares → expenseSplits → transactions [→ users]`).
  `transaction-repository` ganhou `findById` sem escopo de workspace
  (mesmo padrão do `account.findById` do M3-02) — necessário pra buscar a
  transação original a partir do `split.transactionId` sem depender do
  workspace "ativo" de quem está confirmando.
- **Use-cases** (`application/use-cases/split/`): `createSplit`
  (reaproveita `splitInstallments` do M1 pra divisão igual — mesma lógica
  de arredondamento das parcelas de cartão), `cancelSplit`,
  `markSharePaid`, `confirmShareReimbursement`, `listOwedByMe`,
  `listOwedToMe`. Diferente do `createTransaction` (M1), a transação de
  reembolso é criada via `repos.transaction.create` direto — o
  `createTransaction` amarra `method=transfer` a duas contas do mesmo
  workspace, não serve pra reembolso entre usuários.
- **Rotas HTTP** (`http/modules/split/`): módulo novo, registrado em
  `main/app.ts`. `not_creator`/`not_participant` devolvem o mesmo 404
  genérico de "não encontrado" — não revelam que o split/parte existe pra
  quem não é dono dela.
- **Mobile**: `lib/split-api.ts` (client), `components/forms/
  create-split-form.tsx` (lista dinâmica de participantes, sem RHF —
  linhas heterogêneas user/external não encaixam bem num único schema
  fixo), botão embutido em `edit-transaction-form.tsx` (troca pro form de
  split no lugar, mesmo diálogo), tela `app/(app)/splits.tsx` (abas devo/
  me devem). Ícone novo: `ArrowsSplitIcon` (phosphor). Tipo `Transaction`
  do mobile ganhou `accountId` (já vinha na resposta da API, só não
  estava tipado) pra decidir quando mostrar o botão de dividir.

## Testes

`split.test.ts` (14 casos, contra Postgres real): divisão igual (com
arredondamento pro criador), soma manual igual ao total (permitido), soma
manual maior que o total (rejeitado), participante inexistente,
autotransferência recusada, participante externo por nome, despesa vs
receita (rejeitado), split duplicado na mesma transação (rejeitado),
fluxo completo de dois lados (paga → confirma → gera reembolso →
notifica, com checagem de autorização em cada passo), participante
externo confirmando direto sem "pago", cancelamento permitido/bloqueado
conforme estado das partes, autorização de cancelamento (só criador),
`listOwedByMe`/`listOwedToMe` refletindo o estado corretamente. 131/131
testes do backend passando (117 + 14 novos), typecheck limpo em todos os
pacotes (backend, db, shared, storage, **mobile**).

Mobile: mesma ressalva do M3-02 — typecheck limpo e rotas reais
confirmadas no `expo-router` typegen, mas sem clique manual num app
rodando de verdade.

## Próximo passo

Nenhum bloqueio técnico restante. Mesma recomendação do M3-02: vale
alguém clicar o fluxo completo (dividir → participante paga → criador
confirma → conferir saldo/relatório) num app rodando de verdade antes de
considerar 100% fechado na prática.
