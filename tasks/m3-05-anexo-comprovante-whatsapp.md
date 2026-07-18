# M3-05 — Anexo de comprovante via WhatsApp (foto no chatbot)

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Segunda metade do "anexo de comprovante" do spec (Milestones, M3) — pelo
canal do chatbot: usuário manda uma foto no WhatsApp junto (ou logo após)
de registrar uma transação, e ela vira o comprovante anexado.

## Escopo

### Backend
- `apps/backend/src/http/modules/whatsapp/routes/webhook.ts` — hoje só
  trata mensagens de texto (`extractTextMessages`,
  `if (change.field !== "messages") continue`). Precisa reconhecer
  mensagens do tipo `image` no payload do webhook (a Meta manda um
  `media_id`, não o arquivo em si).
- Fluxo de download: `GET https://graph.facebook.com/{media_id}` (Meta
  Cloud API) devolve uma URL temporária de download (expira rápido) →
  baixar o binário → reenviar pro nosso storage
  ([[m3-01-infra-storage-arquivos]]) → gravar `attachment_key`
  ([[m3-04-anexo-comprovante-app]], mesma coluna).
- Regra de associação: a foto vale pra **última transação registrada por
  aquele número** dentro de uma janela curta (ex.: últimos 5 minutos) —
  sem isso, não tem como saber a qual transação a foto se refere. Se não
  houver transação recente, responder pedindo pra mandar o valor/descrição
  primeiro.
- Reaproveita o job assíncrono do webhook (mesmo padrão do M2-06/M2-07 —
  responder rápido à Meta, processar o download/upload em background via
  BullMQ).

### Mobile

Nenhum — canal é só o WhatsApp; o resultado (comprovante anexado) aparece
no app através da tela de detalhe da transação, já construída em
[[m3-04-anexo-comprovante-app]].

## Dependências

[[m3-01-infra-storage-arquivos]] e [[m3-04-anexo-comprovante-app]]
(bloqueantes — reaproveita schema e storage de lá). [[m2-06-whatsapp-webhook-chatbot]]
(webhook já existe, só ganha um novo tipo de mensagem).

## Próximo passo

Decidir a janela de tempo exata pra associar foto → última transação (e o
que fazer se chegarem duas fotos, ou nenhuma transação recente existir).
