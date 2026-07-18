# M2-05 — Vínculo do WhatsApp por OTP

**Status:** 🟢 Concluída.

## Contexto

Pré-requisito de segurança pro chatbot ([[m2-06-whatsapp-webhook-chatbot]]):
o vínculo telefone↔conta **nasce no app autenticado**, nunca só pela conversa
(spec, "Vínculo do WhatsApp por OTP (M2)") — impede que alguém cadastre o
telefone de outra pessoa e receba os dados dela.

## Decisão de design (2026-07-16): sem coluna `attempts`

O desenho original do spec previa `WhatsAppLinkCode(attempts, ...)`. Na
prática, o número remetente só é conhecido quando a mensagem chega no
webhook — é o próprio dado sendo vinculado — então não dá pra incrementar um
contador de tentativas numa linha específica antes de já ter batido o hash e
achado a linha certa. Decisão fechada com o usuário: sem coluna `attempts`;
a proteção de força bruta é o rate limit por telefone remetente
(`deps.rateLimiter`, 3 tentativas/15min), mesmo padrão já usado no reset de
senha por código. Ver comentário em
`packages/db/src/schema/whatsapp-link-code.ts`.

## Implementação

### Backend
- Schema: `whatsapp_link_codes` (user_id, code_hash, expires_at, used_at,
  created_at — sem `attempts`) e `whatsapp_links` (workspace_id, wa_chat_id
  único, linked_by — usada pelo M2-06 pra vincular grupos). `users.phone`
  (já existia desde o M1, pensado pra isso) é o campo vinculado/revogado.
- Novo tipo de notificação `whatsapp_linked` (`NOTIFICATION_TYPES`,
  `notification_type` enum) — soma aos 4 tipos do M2-10.
- `apps/backend/src/application/use-cases/whatsapp/`:
  - `startWhatsAppLink(deps, userId)`: autenticado, rate limit por conta
    (3/15min), invalida códigos anteriores não usados, gera código de 6
    dígitos (reaproveita `deps.tokens.generateCode()`, TTL 5min —
    `WHATSAPP_LINK_TTL_MS`).
  - `confirmWhatsAppLink(deps, phone, code)`: chamado pelo processamento do
    webhook (M2-06), não é uma rota HTTP pública. Rate limit por telefone
    ANTES do lookup por hash; rejeita se o telefone já pertence a outro
    usuário; vincula (`uow.run`: `updatePhone` + `markUsed`) e notifica
    (`whatsapp_linked`).
  - `revokeWhatsAppLink(deps, userId)`: autenticado, zera `users.phone`.
- Rotas: `POST /whatsapp/link/start` e `DELETE /whatsapp/link` (ambas
  autenticadas). Testado ponta-a-ponta via curl (200/204/401) e suíte
  `whatsapp.test.ts` (7 casos: geração, rate limit de start, confirmação
  certa/errada/reuso, telefone já vinculado, rate limit de confirm, revogação).
- `UserRepository` ganhou `findByPhone`/`updatePhone`.

### Mobile
- `apps/mobile/src/app/(app)/whatsapp-link.tsx`: gera e exibe o código
  (copiável, com countdown de expiração), botão "Abrir WhatsApp" (deep link
  `wa.me` com o código pré-preenchido, usa `EXPO_PUBLIC_WHATSAPP_NUMBER` se
  configurado), poll a cada 5s enquanto o código está ativo (chama
  `refreshUser()` — o vínculo é confirmado pelo backend via webhook, não
  por essa tela), estado vinculado com botão revogar.
- Entrada em `profile.tsx` (card "WhatsApp": vinculado/não vinculado).
- `AuthSession`/`MeOutput` (backend e mobile) ganharam `user.phone`.
- Nova dependência: `expo-clipboard` (instalada via `bunx expo install`).

## Dependências

Nenhuma técnica direta — testado ponta-a-ponta sem precisar do webhook real
([[m2-06-whatsapp-webhook-chatbot]]) existir. O webhook é quem vai chamar
`confirmWhatsAppLink` de verdade quando a mensagem com o código chegar.
