# M2-06b — Vínculo de grupo do WhatsApp a workspace

**Status:** ⚪ Bloqueada — depende de status **Official Business Account
(OBA)** no número de WhatsApp do projeto, concedido pela Meta.

## Contexto

Sub-escopo original de [[m2-06-whatsapp-webhook-chatbot]] ("webhook Meta
Cloud API + grupos↔workspace" — o título da task já previa os dois).
[[m2-05-whatsapp-vinculo-otp]] cobre só o vínculo **individual** (1:1), que
está concluído e validado com mensagem real. Vínculo de **grupo** — várias
pessoas de um workspace compartilhado lançando transação no mesmo grupo de
WhatsApp — ficou de fora.

## Por que está bloqueada

A Groups API oficial do WhatsApp Cloud API (lançada fev/2026) só funciona
em números com status **Official Business Account (OBA)** — um selo que a
Meta concede depois de um processo de verificação de negócio (Meta
Business Manager: documentação, verificação de identidade da empresa,
etc.). Números comuns do WhatsApp Business app e números de teste (o que
está configurado hoje) **não são suportados** por essa API — só conversa
1:1 funciona neles.

Não é uma limitação de código — é uma aprovação externa que só a Meta
concede, pro número específico usado no projeto.

## Como destravar

1. Passar o número de WhatsApp do projeto pelo processo de verificação de
   negócio da Meta (Meta Business Manager) até ele ganhar status OBA.
2. Avisar quando isso acontecer — aí sim retomamos esta task.

## Escopo (quando destravar)

- Endpoint da Groups API pra descobrir/gerenciar grupos onde o número do
  bot está.
- Fluxo de vínculo: alguém do workspace adiciona o bot no grupo → gera um
  código/comando de vínculo (mesmo padrão de OTP do M2-05, adaptado) →
  grupo passa a valer como canal de lançamento pro workspace.
- Definir: qualquer membro do grupo pode lançar transação, ou só quem já é
  membro do workspace? (decisão de produto pendente).

## Dependências

[[m2-05-whatsapp-vinculo-otp]] e [[m2-06-whatsapp-webhook-chatbot]] (ambas
concluídas — a infra de webhook/roteamento já existe, só falta a API de
grupos em si).
