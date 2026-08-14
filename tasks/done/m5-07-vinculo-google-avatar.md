# M5-07 — Vínculo de conta Google pelo perfil + avatar de usuário

**Status:** 🟢 Concluída (2026-08-14), validada com testes reais contra
Postgres + typecheck/lint/build em backend, dashboard e mobile. Vincular
Google e avatar por upload manual entram no dashboard; avatar entra também
no mobile (exibição + upload/remoção) — vínculo pelo mobile fica no
backlog junto do login social do mobile
([`backlog/m5-06b-google-login-mobile.md`](../backlog/m5-06b-google-login-mobile.md)),
que já ganhou uma nota apontando que o backend de vínculo está pronto e
não muda quando aquilo destravar.

## Contexto

M5-06 (Fase 1) entregou login social com Google mas deixou de propósito
fora de escopo vincular Google a quem já tem conta por senha — hoje login
com Google usando um e-mail já cadastrado por senha é **bloqueado**
(`google_email_registered`). O usuário pediu essa extensão pela tela de
perfil (rejeitando se aquela conta Google já estiver vinculada a outro
usuário) e, aproveitando a integração já existente, suporte a avatar:
foto do Google por padrão pra quem entrou por ali, upload manual pra quem
não tem.

Três decisões de produto foram perguntadas via `AskUserQuestion` e não
houve resposta a tempo — segui a opção recomendada em cada uma, sinalizado
no plano pra revisão antes de implementar (aprovado sem objeção):

1. **Vínculo exige e-mail igual** — o e-mail da conta Google tem que bater
   com o e-mail da conta na plataforma; senão `google_link_email_mismatch`.
2. **Desvincular é suportado** — sem bloqueio mesmo pra quem nunca definiu
   senha de verdade (conta só-Google): "esqueci minha senha" sempre
   funciona (baseado em posse do e-mail, não na senha antiga), então não
   existe risco real de lockout.
3. **Avatar tem reversão automática** — qualquer usuário pode subir foto
   própria a qualquer momento; removê-la volta pra foto do Google (se
   vinculado) ou pras iniciais.

## Decisão de arquitetura: 2 colunas em `users`, sem rota nova pra servir avatar

`users` ganha `avatarUrl` (URL externa — hoje só a `picture` do Google) e
`avatarKey` (chave no storage S3-compatible, mesmo padrão de
`attachmentKey` em `transactions`). Prioridade de exibição: `avatarKey`
(upload manual) > `avatarUrl` (Google) > `null` (iniciais) — isso já
implementa a reversão automática sem precisar de um campo "origem" extra.

**Sem rota pública nova.** O bucket já é privado (M3-01); reaproveitei
`Storage.getSignedReadUrl` (mesmo TTL de 300s do anexo de comprovante)
direto dentro de `issueSession`/`me`, computando o `avatarUrl` final ali
mesmo. Como o dashboard já chama `/auth/me` a cada navegação e o mobile
chama `refreshUser()` após qualquer mutação de perfil, uma URL assinada de
5 minutos é sempre fresca o suficiente — sem inventar rota pública, sem
mudar o bucket pra público, sem gerenciar refresh de URL na UI.

## Implementação

### Backend

- Migration única: `users.avatar_url`/`avatar_key` (nullable) +
  `uniqueIndex('oauth_accounts_user_provider_idx')` em
  `(user_id, provider)` — impede um mesmo usuário linkar duas contas
  Google diferentes.
- `GoogleIdentity` ganha `picture: string | null` (claim nativa do
  `google-auth-library`, só faltava mapear).
- `UserRepository` ganha `updateAvatarUrl`/`updateAvatarKey`;
  `OauthAccountRepository` ganha `findByUserAndProvider`/
  `deleteByUserAndProvider`.
- `resolve-avatar-url.ts` — helper compartilhado por `session.ts`
  (`issueSession`) e `me.ts`: computa a URL final e o `googleLinked`
  (`!!oauthAccount`) — os dois passam a expor `avatarUrl`/`googleLinked`
  em `AuthSession.user`/`MeOutput.user`.
- `google-sign-in.ts`: usuário novo já nasce com `avatarUrl: identity.picture`.
- `link-google-account.ts` (novo): valida token, e-mail verificado,
  e-mail igual ao da conta → rejeita `google_link_email_mismatch`; Google
  já vinculado a outro usuário → `google_account_linked_elsewhere`; usuário
  já tem outro Google vinculado → `google_already_linked`; sucesso é
  idempotente (relinkar o mesmo Google não duplica) e preenche `avatarUrl`
  só se estava vazio.
- `unlink-google-account.ts` (novo): sem vínculo → `google_not_linked`;
  com vínculo → remove a linha. Não mexe no avatar (desvincular é sobre
  método de login, não sobre a foto — desacoplado de propósito).
- `upload-avatar.ts`/`remove-avatar.ts` (novos): mesmo esqueleto de
  `upload-attachment.ts`/`delete-attachment.ts` (M3-04) — jpg/png/webp,
  2MB (menor que os 5MB do comprovante), substitui/deleta o objeto
  anterior do storage.
- 4 rotas novas atrás de `requireAuthenticated`: `POST /auth/me/google/link`,
  `POST /auth/me/google/unlink`, `POST /auth/me/avatar` (multipart, mesmo
  padrão de checagem de `Content-Length` do M3-04), `DELETE /auth/me/avatar`.
- 7 variantes novas de `AuthError` (`google_link_email_mismatch`,
  `google_account_linked_elsewhere`, `google_already_linked`,
  `google_not_linked`, `invalid_file_type`, `file_too_large`,
  `avatar_not_found`), mapeadas em `AUTH_ERRORS`.
- Testes novos em `auth.test.ts` (3 describes: vínculo, desvínculo,
  avatar) — 11 casos, todos passando contra Postgres real.

### Dashboard

- `SessionUser` ganha `avatarUrl`/`googleLinked`; `auth-api.ts` ganha
  `linkGoogle`/`unlinkGoogle`/`uploadAvatar`/`removeAvatar`.
- Refatoração pequena: carregamento do script GIS + `initialize`/
  `renderButton` extraído de `google-sign-in-button.svelte` pra
  `lib/google-identity.ts`, reaproveitado por `google-link-button.svelte`
  (novo) — a diferença entre os dois é só o que acontece no callback
  (login redireciona; vínculo submete um form oculto pra `?/linkGoogle`).
- 4 actions novas em `account/+page.server.ts`; card "Conta Google" novo
  em `account/+page.svelte` (vincular/desvincular conforme
  `data.user.googleLinked`) e seção de avatar no card de Perfil
  (`avatar-field.svelte`, novo — molde de `attachment-field.svelte`, preview
  otimista via `URL.createObjectURL` no upload).

### Mobile

- `AuthSession['user']` ganha `avatarUrl`; `authApi` ganha
  `uploadAvatar`/`removeAvatar` (mesmo padrão multipart de
  `attachment-api.ts`, M3-04).
- `profile.tsx`: círculo `UserIcon` fixo vira foto real quando
  `user.avatarUrl` existe (com fallback pro ícone); botões "Alterar
  foto"/"Remover foto" usando `expo-image-picker` (já dependência do
  projeto) + `refreshUser()` pós-mutação, mesmo padrão de
  `edit-name-form.tsx`.
- Vincular/logar com Google no mobile **não** entra aqui — mesmo bloqueio
  externo do M5-06b (Client IDs iOS/Android); nota adicionada lá deixando
  claro que só o botão de Google ficou de fora, não o avatar.

## Validação final

- `bun run db:generate` + `db:migrate` contra Postgres local (`docker
  compose up postgres`) — aplicada sem conflito.
- `bun run typecheck --filter=@finance/backend` — limpo.
- `bun test src/application/use-cases/auth/auth.test.ts` — **11 testes
  novos, todos passando** (mais os já existentes); as mesmas 3 falhas
  pré-existentes e não relacionadas do M5-06 (`Bun.CryptoHasher` em
  `verify-email`/lockout) continuam lá, fora de escopo desta rodada.
- `bun run lint` (Biome, monorepo) — limpo.
- `docker build` real do backend — sem dependência nova desta vez, build
  ok, confirma que a migration/schema não quebra a imagem.
- Dashboard: `svelte-check` (0 erros), `eslint` limpo, `prettier --check`
  limpo (nos arquivos tocados), `bun run build` (`adapter-cloudflare`) ok
  — um `EPERM` transitório do Windows na limpeza do `.svelte-kit/cloudflare`
  (um `vite.exe` órfão de uma sessão anterior segurando o diretório) foi
  identificado e resolvido matando o processo; não é um problema de código.
- Mobile: `tsc --noEmit` limpo; `expo lint` só reportou 1 erro + 3 warnings
  pré-existentes em `pinned-formulas.tsx`/`formula-form.tsx` (confirmado
  via `git status` que nenhum dos dois foi tocado nesta rodada) — nenhum
  problema nos arquivos novos/alterados.
- **Smoke manual (clique real em vincular/desvincular, upload de foto)
  fica por conta do usuário** — sem browser neste ambiente; o
  `PUBLIC_GOOGLE_CLIENT_ID` já está configurado localmente desde o M5-06,
  então dá pra testar de verdade em `bun run dev`.

## Fora de escopo desta rodada (documentado, não esquecido)

- Vincular/logar com Google no mobile — ver
  [`backlog/m5-06b-google-login-mobile.md`](../backlog/m5-06b-google-login-mobile.md).
- Fragmento OpenAPI das 4 rotas novas (`docs/api/openapi.json`) — não
  atualizado nesta rodada; próximo passo se/quando a doc for revisitada.
