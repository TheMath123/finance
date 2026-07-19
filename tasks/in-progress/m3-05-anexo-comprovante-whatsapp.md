# M3-05 — Anexo de comprovante via WhatsApp (foto no chatbot)

**Status:** 🟡 Em andamento — código completo, testado com storage
in-memory. **Não validado contra o R2 real nem contra a Meta Cloud API de
verdade** (mesma ressalva do M3-01/M3-04 — bucket ainda não existe;
adicionalmente aqui, o fluxo de download de mídia da Meta nunca rodou
contra o número de teste real).

## Contexto

Segunda metade do "anexo de comprovante" do spec (Milestones, M3) — pelo
canal do chatbot: usuário manda uma foto no WhatsApp junto (ou logo após)
de registrar uma transação, e ela vira o comprovante anexado.

**Decisão (2026-07-19):** janela de associação de **5 minutos** (era só
um "ex." no rascunho original, virou o valor real). "Duas fotos" não
precisa de lógica especial — a segunda simplesmente substitui a primeira,
reaproveitando o comportamento de "troca o anexo anterior" que o
`uploadAttachment` (M3-04) já tinha. "Nenhuma transação recente" já tinha
resposta definida no rascunho original (pede pra registrar primeiro).

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
(bloqueantes — reaproveita schema e storage de lá, e principalmente
reaproveita a use-case `uploadAttachment` inteira, não só o schema).
[[m2-06-whatsapp-webhook-chatbot]] (webhook já existe, só ganha um novo
tipo de mensagem).

## Implementação

- **Webhook** (`http/modules/whatsapp/routes/webhook.ts`): novo
  `extractImageMessages` (mesmo padrão de `extractTextMessages`, mas pro
  campo `message.image.id`) — enfileira um job novo por foto recebida,
  sem processar nada de síncrono (mesma regra do M2-06: responder rápido
  à Meta).
- **Job novo** (`packages/queues/src/jobs.ts`): `whatsapp.inbound-image`
  — payload só com `{ from, mediaId, mimeType }` (pequeno, serializável;
  o download em si não vai no payload).
- **Client Meta** (`infra/whatsapp/meta-cloud-api.ts`): `fetchMediaUrl`
  (resolve `media_id` → URL temporária de download, que expira rápido —
  por isso nunca é guardada) e `downloadMedia` (baixa o binário; ambos
  exigem o Bearer token, a URL de download não é pública).
- **Use-case** (`application/use-cases/whatsapp/handle-inbound-image.ts`):
  `handleInboundWhatsAppImage` — resolve o usuário pelo telefone, busca a
  transação mais recente dele (`findMostRecentByCreator`, novo método no
  `TransactionRepository`, janela de 5 min) e **reaproveita
  `uploadAttachment` do M3-04 direto** (mesmo ator sintético
  `{ userId, workspaceId, role: "member" }` usado no sweep de
  recorrências) — ganha de graça a validação de tipo/tamanho e a troca de
  anexo anterior, sem duplicar nenhuma regra.
- **Job handler** (`main/job-handlers.ts` + `main/worker.ts`): o
  *download* da mídia (infra, fala com a Meta) acontece aqui, fora da
  use-case — a use-case só recebe `buffer`/`mimeType` já prontos, mesma
  filosofia de "use-case livre de infra concreta" do resto do módulo
  WhatsApp. `worker.ts` ganhou `storage` nas deps (não tinha antes, só
  precisava pro texto).

## Testes

`handle-inbound-image.test.ts` (6 casos, contra Postgres real + storage
in-memory): número não vinculado, sem transação recente, anexo bem
sucedido, tipo de arquivo inválido (mensagem clara, nada é gravado),
transação fora da janela de 5 minutos (mesmo tratamento de "sem
transação recente" — comportamento correto por composição, não por
código especial), segunda foto substitui a primeira. 144/144 testes do
backend passando (138 + 6 novos), typecheck limpo em todos os pacotes.

**Não validado**: contra o R2 real (mesma ressalva do M3-01/M3-04) nem
contra a Meta Cloud API de verdade — o download de mídia
(`fetchMediaUrl`/`downloadMedia`) nunca rodou contra um `media_id` real
da Meta nesta sessão.

## Próximo passo

Quando o bucket do M3-01 existir: mandar uma foto de teste pro número do
WhatsApp vinculado, logo depois de registrar uma transação por lá, e
conferir o comprovante aparecendo no app. Só aí mover pra `done/`.
