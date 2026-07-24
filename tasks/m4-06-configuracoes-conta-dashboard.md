# M4-06 — Configurações de conta

**Status:** 🔵 Backlog (não iniciada)

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

## Critério de conclusão

Trocar senha/e-mail, revogar vínculo WhatsApp e excluir conta (fluxo de
confirmação completo) funcionando contra o backend real.
