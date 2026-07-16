# M2-06 — Chatbot WhatsApp: webhook Meta Cloud API + grupos↔workspace

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Núcleo do canal WhatsApp (spec, seção "Chatbot WhatsApp" + "Meta Cloud API
(oficial)" em Decisões de arquitetura). A Meta exige resposta rápida ao
webhook — por isso o processamento real acontece assíncrono via
[[m2-01-infra-redis-bullmq]].

## Escopo

### Backend
- Endpoint de webhook (`POST /whatsapp/webhook` + `GET` de verificação do
  Meta), validando a assinatura da Meta.
- Ao receber mensagem: responder 200 imediatamente, enfileirar o processamento
  real (BullMQ) — nunca processar de forma síncrona no handler do webhook.
- Roteamento por número: número não vinculado → só instrução de vínculo
  (nunca dado financeiro) — delega pra [[m2-05-whatsapp-vinculo-otp]] quando
  a mensagem é um código de 6 dígitos.
- Model `WhatsAppLink` (`workspace_id, wa_chat_id, linked_by`) — vincula
  grupo/conversa a um workspace; comando de vincular grupo exige que quem
  mandou já esteja vinculado com papel `owner`/`admin` naquele workspace.
- Resolução do workspace de destino: conversa privada → workspace padrão do
  usuário vinculado; grupo → workspace vinculado ao `wa_chat_id`.
- `TransactionService.create(workspaceId, userId, input)` (camada
  canal-agnóstica já prevista desde o M1) é o ponto de entrada — o webhook
  nunca grava direto no banco.

### Fora desta task
- A interpretação da mensagem em si (linguagem natural → transação) é
  [[m2-07-ia-pipeline-transacoes]] — aqui o escopo é só a infraestrutura de
  receber/rotear/responder no WhatsApp.

## Dependências

[[m2-01-infra-redis-bullmq]] (processamento assíncrono) e
[[m2-05-whatsapp-vinculo-otp]] (só aceitar mensagem de número vinculado).

## Próximo passo

Configurar o app no Meta for Developers (WhatsApp Business API, número de
teste) antes de escrever código — sem isso não dá pra validar o webhook de
verdade.
