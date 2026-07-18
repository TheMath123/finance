# M3-04 — Anexo de comprovante nas transações (app)

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Spec (Milestones, M3): "anexo de comprovante nas transações (storage
S3/R2, incluindo foto via chatbot)". Esta task cobre o upload manual pelo
app; o upload via foto no WhatsApp é [[m3-05-anexo-comprovante-whatsapp]]
(depende desta pro schema, mas é implementação separada — canal
diferente).

Não modelado no spec (`spec.md` não tem uma entidade `TransactionAttachment`
nem campo em `Transaction` pra isso) — decisão de schema é desta task.

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

[[m3-01-infra-storage-arquivos]] (bloqueante — precisa do client de
storage pronto antes de implementar upload/leitura).

## Próximo passo

Confirmar o limite de tamanho de arquivo (compressão client-side antes do
upload, pra não estourar limite de payload da API) e se comprovante em
PDF é aceito além de imagem.
