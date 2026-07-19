# M3-02 — Transferência entre usuários + contato confiável

**Status:** 🟢 Concluída (2026-07-19) — backend validado com testes de
integração reais contra Postgres; mobile typecheck limpo e ligado a rotas
reais (não-mockadas), mas **sem clique manual num simulador/app rodando**
(ver "Testes").

## Contexto

Spec, seção "Interações entre usuários — camada social (M3)" > "Transferência
entre usuários". Modelos já fechados no spec: `InterUserTransfer` e
`TrustedContact`. Diferente de uma transferência normal (M1, entre contas do
**mesmo** workspace) — aqui o destinatário é outro **usuário da
plataforma**, possivelmente em outro workspace que o remetente nunca vê.

**Correção de escopo (2026-07-19):** a primeira versão desta task dizia
"resposta genérica, nunca confirmar/negar existência de conta" pro
`recipient_not_found` — isso era uma paráfrase excessivamente rígida.
O spec.md (linha 131) só exige "destinatário não-usuário não é notificado
(nada de vazamento de existência de conta)" — ou seja, a garantia é sobre
**notificação**, não sobre a resposta HTTP. Como só é possível notificar um
`toUserId` que já existe como usuário (FK `not null`), essa garantia já
sai de graça: se o destinatário não existe, a rota simplesmente responde
`recipient_not_found` (como um Pix normal faria) e nada é criado/debitado.

## Escopo

### Backend
- `POST /workspaces/:workspaceId/transfers` — remetente aponta destinatário
  por telefone/e-mail de usuário existente na plataforma; nasce a
  transação de saída (`from_transaction_id`) imediatamente no workspace do
  remetente, e o registro `InterUserTransfer` com `status=pending`
  (caminho com `:workspaceId`, não `POST /transfers` como o rascunho
  original desta task previa — segue a mesma convenção REST de toda
  escrita workspace-scoped já usada no projeto, ex.:
  `POST /workspaces/:workspaceId/invites`).
  - Se o telefone/e-mail não corresponde a usuário nenhum, erro
    `recipient_not_found` normal (ver correção de escopo no Contexto).
  - Rate limit por remetente (mesmo padrão de `rate-limiter` já usado em
    login/OTP) — 10/hora.
- `POST /transfers/:id/accept` — destinatário escolhe em qual conta dele a
  entrada cai (a conta já resolve o workspace, já que toda conta pertence
  a um workspace só); gera `to_transaction_id` (entrada), `status=accepted`.
  Opcionalmente marca o remetente como `TrustedContact`
  (`default_account_id` = a conta escolhida agora).
- `POST /transfers/:id/reject` — `status=rejected`, sem gerar transação de
  entrada.
- `GET /transfers/pending` — recebidas, aguardando aceite/recusa (rota que
  faltava no rascunho original — o app precisa disso pra montar a tela).
- `GET /transfers/accounts` — contas do usuário logado em **qualquer**
  workspace seu, pro seletor de destino no aceite (idem — faltava no
  rascunho original).
- Expiração: sub-rotina nova (`sweepExpiredTransfers`) no **sweep diário já
  existente** (`setInterval` em `main/worker.ts`, não um job repetível do
  BullMQ — ver nota em `notification/sweep.ts`) marca `status=expired` em
  transferências pendentes há mais de 30 dias (spec) — expirar **não**
  afeta a transação de saída do remetente (ela já existe e fica). Sem
  notificação de expiração (só `transfer_pending`/`transfer_accepted`
  existem — escopo mínimo).
- **Contato confiável**: se o remetente de uma nova transferência já é
  `TrustedContact` do destinatário, pular o aceite manual — gerar a
  entrada automaticamente na `default_account_id` (`status=accepted`
  direto, sem passar por `pending`).
- `GET /trusted-contacts` (listar), `DELETE /trusted-contacts/:id`
  (remover confiança).
- Notificação (reaproveita [[m2-10-notificacoes-push]], soma dois
  `notification_type` novos — `transfer_pending`/`transfer_accepted`) —
  destinatário só é notificado se **é** usuário da plataforma (garantido
  pela FK: só existe transferência com `toUserId` válido).

### Mobile
- Tela "Enviar transferência" (`/transfers/new`) — destinatário por
  telefone/e-mail + valor + descrição + conta de origem (workspace ativo).
- Tela "Transferências pendentes" (`/transfers`) — recebidas, com seletor
  de conta de destino (entre todos os workspaces do usuário) + checkbox
  "confiar" + aceitar/recusar.
- Tela "Contatos confiáveis" (`/trusted-contacts`) — listar e remover.
- Notificação → deep link pra `/transfers` (`push-notifications.ts`,
  `data.transferId`).
- Nav entries em `accounts.tsx`: "Enviar transferência" (sempre visível),
  "Transferências pendentes" (só quando há pendência, com contador,
  mesmo padrão de "Convites recebidos"), "Contatos confiáveis".

## Dependências

[[m2-10-notificacoes-push]] (notificação). ~~[[m2-01-infra-redis-bullmq]]
(job de expiração)~~ — no fim não precisou: a expiração virou uma
sub-rotina do sweep diário já existente (`setInterval`), não um job novo
de fila. Nenhuma dependência de [[m3-01-infra-storage-arquivos]] nem de
[[m3-03-split-despesas]] — feita em paralelo com ambas, como previsto.

## Implementação

- **Schema** (`packages/db/src/schema/`): `inter-user-transfer.ts`
  (`interUserTransferStatusEnum`, tabela `inter_user_transfers` com índices
  em `(toUserId, status)`, `fromUserId` e `(status, expiresAt)` pro sweep)
  e `trusted-contact.ts` (`trusted_contacts`, único por
  `(userId, trustedUserId)`). `notificationTypeEnum` ganhou
  `transfer_pending`/`transfer_accepted`. Migration `0010_bitter_siren.sql`
  aplicada no Postgres local.
- **Repositórios**: `inter-user-transfer.repository.ts`,
  `trusted-contact.repository.ts` (novos), e `account.repository.ts` ganhou
  `listActiveForUser`/`findById` (contas de todos os workspaces do usuário
  — necessário pro destinatário escolher destino sem o remetente saber
  quais workspaces ele tem).
- **Use-cases** (`application/use-cases/transfer/`): `createTransfer`,
  `acceptTransfer`, `rejectTransfer`, `listPendingTransfers`,
  `listTransferAccounts`, `listTrustedContacts`, `removeTrustedContact`.
  Transações da transferência (saída/entrada) são criadas via
  `repos.transaction.create` direto (não via `createTransaction`, que
  amarra `method=transfer` a duas contas do **mesmo** workspace) —
  `method="pix"` pros dois lados, categoria `findFallback` do workspace de
  cada lado (mesma "Outros" seedada em todo workspace, sem precisar criar
  categoria nova).
- **Sweep de expiração**: `sweepExpiredTransfers` somada em
  `notification/sweep.ts` → `runNotificationSweep`, chamada pelo mesmo
  `setInterval` diário de `main/worker.ts` que já cuidava de fatura/
  recorrência.
- **Rotas HTTP** (`http/modules/transfer/`): módulo novo, registrado em
  `main/app.ts`. Erros mapeados em `errors.ts` (`not_recipient` devolve o
  mesmo 404 genérico de `transfer_not_found` — não revela que a
  transferência existe pra quem não é parte dela).
- **Mobile**: `lib/transfer-api.ts` (client), schemas em
  `lib/schemas/finance.ts` (`createTransferSchema`/`acceptTransferSchema`),
  form `components/forms/create-transfer-form.tsx` (RHF + zodResolver,
  mesmo padrão de `create-account-form.tsx`), telas
  `app/(app)/transfers/new.tsx`, `app/(app)/transfers/index.tsx` (usa
  `Select`/`Checkbox` "crus", não via RHF, já que é uma ação por item de
  lista, não um form) e `app/(app)/trusted-contacts.tsx`. Ícones novos:
  `PaperPlaneTiltIcon`, `HandCoinsIcon`, `HandshakeIcon` (phosphor).

## Testes

`transfer.test.ts` (11 casos, contra Postgres real via `createTestDeps`):
destinatário inexistente, autotransferência, valor inválido, criação +
débito + notificação, rate limit (11ª bloqueada), aceite com escolha de
conta + notificação ao remetente, intruso não aceita transferência alheia,
recusa não gera entrada, transferência já finalizada não aceita/recusa de
novo, contato confiável faz a 2ª transferência entrar automático (+
notificação + remoção do contato), sweep expira pendente vencida sem
mexer na transação do remetente. 117/117 testes do backend passando,
typecheck limpo (`packages/db`, `apps/backend`).

Mobile: `bunx tsc --noEmit` limpo (rotas novas confirmadas no
`expo-router` typegen, que só regenera com o Metro bundler rodando — feito
via `bunx expo start --web` momentâneo só pra isso). **Não validado com
clique manual** num simulador/browser logado de verdade — as telas existem,
estão no nav e chamam a API real (não mockada), mas o fluxo completo
(login → enviar → aceitar) não foi exercitado interativamente nesta sessão.

## Próximo passo

Nenhum bloqueio técnico restante. Ficaria bom, antes de considerar 100%
fechado, alguém clicar o fluxo completo (enviar → notificação → aceitar
escolhendo conta → conferir saldo dos dois lados) num app rodando de
verdade — os testes automatizados cobrem a lógica, mas não a UX real.
