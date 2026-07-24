# M4-06 — Configurações de conta

**Status:** 🟡 Em andamento — código completo (lint, typecheck e build de
produção limpos); falta a validação manual do usuário no browser.

## Contexto

`spec.md`, "Configurações": verificação de e-mail, revogação do vínculo
WhatsApp, exclusão de conta com confirmação forte (LGPD). Backend já
existe inteiro (`apps/backend/src/http/modules/auth/routes/`
`request-account-deletion.ts`/`confirm-account-deletion.ts`, verificação
de e-mail, troca de e-mail/senha; vínculo WhatsApp em
`http/modules/whatsapp/`).

## Escopo

### Dashboard
- `routes/(app)/settings/+page.svelte` — dados da conta (nome, e-mail),
  troca de senha (`change-password.ts`), troca de e-mail com confirmação
  (`request-email-change.ts`/`confirm-email-change.ts`).
- `lib/components/settings/whatsapp-link.svelte` — status do vínculo,
  revogar (reaproveita as rotas do M2-05; iniciar vínculo continua
  exclusivo do app, pois depende de mandar OTP por WhatsApp a partir de um
  número que o usuário já tem no celular — não faz sentido iniciar pelo
  desktop).
- `lib/components/settings/delete-account.svelte` — confirmação forte
  (reautenticação por senha + digitar frase de confirmação, mesmo padrão
  de fricção intencional que o app já usa) antes de chamar
  `request-account-deletion.ts`.

## Dependências

M4-01 (auth). Independente das demais tasks do M4 — pode ser feita em
paralelo a M4-03/04/05.

## Implementação (2026-07-24)

Um desvio consciente do escopo original:
- **`/more/account` em vez de `/settings`** — virou uma 4ª aba do hub
  "Mais" (Contas | Cartões | Bancos | **Conta**) em vez de rota isolada
  fora da navegação — consistente com onde o M4-03/04/05 já colocaram
  configuração financeira, e evita mais um item solto na sidebar/barra
  mobile (já discutido nas rodadas de responsividade). Sem componentes
  separados (`whatsapp-link.svelte`, `delete-account.svelte`) — um
  `Card` por seção na mesma página, como as demais telas do M4.

O que existe:
- `lib/server/auth-api.ts` ganhou `updateName`, `changePassword`,
  `requestEmailChange`, `confirmEmailChange`, `requestAccountDeletion`,
  `confirmAccountDeletion`. `lib/server/whatsapp-api.ts` (novo) —
  `revokeWhatsAppLink` (iniciar vínculo continua exclusivo do app, como o
  escopo original já previa). `lib/schemas/account.ts` espelhando a
  validação do backend.
- **Perfil**: nome editável + e-mail (com aviso se não verificado).
- **Trocar senha**: passa o `refreshToken` da própria sessão
  (`getRefreshToken(cookies)`, já exposto por `session.ts` desde o
  M4-01) pro backend — sem isso, `changePassword` revogaria TODAS as
  sessões (é o comportamento padrão do backend, mais seguro) e
  deslogaria o próprio dashboard na hora; com o token, só a sessão atual
  sobrevive.
- **Trocar e-mail**: fluxo de dois passos na mesma página — formulário
  de solicitação (novo e-mail + senha) ou, se `data.user.pendingEmail`
  já estiver setado (SvelteKit reidrata isso sozinho via
  `invalidateAll` depois de qualquer action), o formulário de código de
  confirmação aparece no lugar automaticamente.
- **WhatsApp**: mostra o número vinculado (via `SessionUser.phone`, já
  exposto por `/auth/me` desde o M4-01) ou aviso de que só o app inicia o
  vínculo; botão de revogar só aparece se já tiver telefone vinculado.
- **Sair**: relocado daqui — antes tinha um card temporário em
  `workspace/settings` (posto lá quando tirei o botão do topo a pedido do
  usuário); agora mora definitivamente na aba Conta.
- **Excluir conta**: fluxo de dois passos igual ao de e-mail (solicitar
  com senha → confirmar com código), com uma fricção a mais só de UI:
  precisa digitar "EXCLUIR" num campo antes dos campos de senha/botão
  saírem do `disabled` — nada no backend depende disso, é só pra evitar
  clique acidental num botão destrutivo logo de cara.

Verificado: lint (Biome + Prettier/ESLint), `svelte-check`, build de
produção e boot do dev server (smoke test) limpos.

## Critério de conclusão

Trocar senha/e-mail, revogar vínculo WhatsApp e excluir conta (fluxo de
confirmação completo) funcionando contra o backend real.
