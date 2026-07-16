# M2-05 — Vínculo do WhatsApp por OTP

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Pré-requisito de segurança pro chatbot ([[m2-06-whatsapp-webhook-chatbot]]):
o vínculo telefone↔conta **nasce no app autenticado**, nunca só pela conversa
(spec, "Vínculo do WhatsApp por OTP (M2)") — impede que alguém cadastre o
telefone de outra pessoa e receba os dados dela. Modelo `WhatsAppLinkCode` já
está desenhado no spec (não existe ainda no schema).

## Escopo

### Backend
- Model `WhatsAppLinkCode` (`id, user_id, code_hash, expires_at, attempts,
  used_at, created_at`) em `packages/db/src/schema/`.
- `POST /whatsapp/link/start` (autenticado): gera OTP de 6 dígitos (reusar o
  mesmo gerador criptográfico do reset de senha —
  `deps.tokens.generateCode()`, já existe), hash no banco, TTL 5min.
- `POST /whatsapp/link/confirm` (chamado pelo webhook do WhatsApp quando o
  número remetente manda o código — ver task M2-06): valida hash+expiração,
  máx. 3 tentativas por código (depois invalida, precisa gerar outro), rate
  limit por telefone e por conta.
- `DELETE /whatsapp/link` (revogar vínculo, autenticado).
- E-mail/notificação de confirmação de vínculo.

### Mobile
- Tela "Vincular WhatsApp" nas configurações: gera e exibe o código (texto,
  copiável), instrução de enviar pro número do bot.
- Estado de vínculo ativo + botão de revogar.

## Dependências

Nenhuma técnica direta, mas só faz sentido testar ponta-a-ponta depois que o
webhook do WhatsApp ([[m2-06-whatsapp-webhook-chatbot]]) existir pra receber
a mensagem com o código.

## Próximo passo

Backend primeiro (schema + as 3 rotas) — dá pra testar `start`/`confirm` via
curl simulando a mensagem antes do webhook real existir.
