# M3-04 — Anexo de comprovante nas transações (app)

**Status:** 🟡 Em andamento — código completo (backend + mobile) e testado
com storage in-memory, mas **não validado contra o R2 real** (bucket do
M3-01 ainda não existe — ver [[m3-01-infra-storage-arquivos]]).

## Contexto

Spec (Milestones, M3): "anexo de comprovante nas transações (storage
S3/R2, incluindo foto via chatbot)". Esta task cobre o upload manual pelo
app; o upload via foto no WhatsApp é [[m3-05-anexo-comprovante-whatsapp]]
(depende desta pro schema, mas é implementação separada — canal
diferente).

Não modelado no spec (`spec.md` não tem uma entidade `TransactionAttachment`
nem campo em `Transaction` pra isso) — decisão de schema é desta task.

**Decisão de escopo (2026-07-19):** só imagem (jpg/png/webp), sem PDF —
não foi pedido além do "talvez" do rascunho original do M3-01, YAGNI até
virar necessidade real. Limite de 5MB, sem compressão client-side (o
formulário já pede qualidade 0.7 no `expo-image-picker`, o que já reduz
bastante o tamanho de fotos de celular).

## Escopo

### Backend
- Campo novo em `transactions` (nullable): `attachment_key` (a `key` no
  bucket, não a URL direta — resolve pra URL assinada na leitura, nunca
  expõe o bucket público). Um comprovante por transação é suficiente pro
  que o spec pede (nada de "múltiplos anexos" mencionado — YAGNI).
- `POST /workspaces/:id/transactions/:id/attachment` — recebe o arquivo,
  valida tipo/tamanho, sobe via o port de [[m3-01-infra-storage-arquivos]],
  grava a `key`.
- `DELETE .../attachment` — remove o anexo (não a transação).
- `GET .../attachment` — devolve URL assinada de leitura (expira em
  minutos, não fica pública indefinidamente).

### Mobile
- Botão "Anexar comprovante" no formulário de criar/editar transação —
  câmera ou galeria (`expo-image-picker`, mesma convenção de instalar via
  `expo install`).
- Preview da imagem anexada na tela de detalhe da transação.

## Dependências

[[m3-01-infra-storage-arquivos]] (bloqueante pra validação real — o
código em si já está pronto e funciona contra o storage in-memory dos
testes; só falta o bucket existir de verdade no R2).

## Implementação

- **Schema**: `attachment_key` (text, nullable) direto em `transactions`
  — migration `0012_sticky_klaw.sql`. `TransactionPatch` (port) e o
  `update()` do repo já eram genéricos o bastante pra aceitar o campo
  novo sem mudança de lógica.
- **Use-cases** (`application/use-cases/attachment/`): `uploadAttachment`
  (valida tipo/tamanho, apaga o anexo antigo antes de subir o novo — nunca
  acumula lixo órfão no bucket; `key` no formato
  `{workspaceId}/{transactionId}/{uuid}.{ext}`), `deleteAttachment`,
  `getAttachmentUrl` (URL assinada, TTL de 5 minutos).
- **Rotas HTTP**: somadas ao módulo `transaction` já existente (não um
  módulo novo) — `POST`/`DELETE`/`GET .../transactions/:id/attachment`.
  O upload lê `request.formData()` direto (Fetch API padrão do Bun/Elysia)
  em vez de tentar validar arquivo com Zod — a regra de tipo/tamanho mora
  no use-case, não na borda HTTP.
- **Mobile**: `expo-image-picker` instalado via `expo install` (plugin
  registrado em `app.json` com as permissões de câmera/galeria).
  `AttachmentField` (componente novo) embutido no
  `EditTransactionForm` — preview via `getAttachmentUrl`, botões câmera/
  galeria, remover. Novo helper `apiRequestUpload` em `api-client.ts`
  (multipart, sem `JSON.stringify`, mesma lógica de retry de sessão dos
  outros helpers). Tipo `Transaction` do mobile ganhou `attachmentKey`.

## Testes

`attachment.test.ts` (7 casos, contra Postgres real + storage in-memory):
tipo de arquivo inválido, tamanho excedido, transação inexistente, upload
válido + leitura via URL assinada, substituição de anexo (key antiga
deletada do storage), erro quando não há anexo, delete limpa storage e
transação. 138/138 testes do backend passando (131 + 7 novos), typecheck
limpo em todos os pacotes (backend, db, shared, storage, mobile).

**Não validado contra o R2 real** — mesmo status do M3-01: sobe sem a
credencial/bucket, só falha no primeiro uso real.

## Próximo passo

Assim que o bucket do M3-01 existir de verdade: subir um comprovante pelo
app e conferir a foto aparecendo no preview. Aí sim mover pra `done/`.
