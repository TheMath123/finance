# M3-01 — Infra de storage de arquivos (S3/R2)

**Status:** 🟡 Em andamento.

## Contexto

Fundação técnica pro anexo de comprovante nas transações
([[m3-04-anexo-comprovante-app]] e [[m3-05-anexo-comprovante-whatsapp]]).
O spec (seção Milestones) cita "storage S3/R2" sem decidir entre os dois —
ambos falam a mesma API (S3-compatible), então o client de aplicação é o
mesmo independente da escolha.

**Decisão (2026-07-19):** AWS S3 agora; migração pra buckets Cloudflare R2
prevista mais pra frente. Client via `@aws-sdk/client-s3` (SDK oficial,
funciona com R2 trocando só o `endpoint`) + `@aws-sdk/s3-request-presigner`
pras URLs assinadas. Nomes de env **genéricos** (`STORAGE_*`, nunca
`AWS_*`) — na troca pra R2 só muda valor de env, zero mudança de código.

## Escopo

### Backend
- Client de storage (`infra/storage/`) atrás de um port —
  `upload(key, buffer, contentType)`, `getSignedUrl(key)` (leitura
  temporária, não expor bucket público), `delete(key)`. Mesma convenção
  de env lazy do resto do projeto (`infra/storage/env.ts`, só valida no
  primeiro uso).
- Decisão de bucket/regra de nomeação de `key` (ex.:
  `{workspaceId}/{transactionId}/{uuid}.{ext}` — nunca nome original do
  arquivo, evita colisão e vazamento de metadado).
- Limite de tamanho/tipo de arquivo (imagem — jpg/png/webp — e talvez PDF
  pra comprovante; nunca arbitrário).
- Test double in-memory do port de storage, mesmo padrão de
  `infra/cache`/`infra/ai` (Redis real vs in-memory nos testes).

### Mobile
- Nenhum ainda — só o SDK de acesso (URL assinada) é consumido depois nas
  tasks de anexo. Sem tela própria aqui.

## Dependências

Nenhuma técnica — mas é pré-requisito de
[[m3-04-anexo-comprovante-app]]/[[m3-05-anexo-comprovante-whatsapp]].

## Implementação

- `application/ports/storage.ts` — port `Storage`: `upload(key, body,
  contentType)`, `getSignedReadUrl(key, ttlSeconds)`, `delete(key)`. A
  regra de nomeação de `key` (ex.: `{workspaceId}/{transactionId}/{uuid}.
  {ext}`) é responsabilidade de quem chama (M3-04/M3-05) — o port em si é
  genérico, não sabe de transação/workspace.
- `infra/storage/env.ts` — env lazy (só valida no primeiro uso real, não
  no boot): `STORAGE_BUCKET`, `STORAGE_REGION`,
  `STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY`, e dois campos só
  relevantes na troca futura pra R2 — `STORAGE_ENDPOINT` (opcional, vazio
  = endpoint padrão da AWS) e `STORAGE_FORCE_PATH_STYLE` (default
  `false`, R2 geralmente precisa `true`).
- `infra/storage/s3-compatible-storage.ts` — `createS3CompatibleStorage()`,
  via `@aws-sdk/client-s3` (`PutObjectCommand`/`GetObjectCommand`/
  `DeleteObjectCommand`) + `@aws-sdk/s3-request-presigner`
  (`getSignedUrl`) pra `getSignedReadUrl`. Client S3 e nome do bucket
  cacheados no primeiro uso (mesmo padrão de `getClaudeClient`/
  `getAiClient` de sessões anteriores).
- `infra/storage/in-memory-storage.ts` — test double (`Map`), pro mesmo
  padrão de `infra/cache`/`infra/ai`.
- `storage: Storage` somado em `UseCaseDeps` (nasce pronto pra
  [[m3-04-anexo-comprovante-app]] plugar sem refatoração, mesma filosofia
  do M1 pro pipeline de IA) — `composition.ts` usa
  `createS3CompatibleStorage()`, `test/deps.ts` usa
  `createInMemoryStorage()`. Limite de tamanho/tipo de arquivo fica pra
  [[m3-04-anexo-comprovante-app]] (é regra de validação na borda da rota
  de upload, não do client de storage em si).

## Testes

`in-memory-storage.test.ts` (3 casos): upload + leitura, leitura de chave
inexistente falha, delete remove a chave. 109/109 testes da suíte do
backend passando, typecheck limpo. **Não validado contra a AWS real** —
bucket/credenciais ainda não configurados neste ambiente (mesmo padrão de
toda integração externa deste projeto: sobe sem a chave, só falha no
primeiro uso real).

## Próximo passo

Pra validar de verdade: criar o bucket S3 na AWS, gerar um usuário
IAM com permissão restrita a esse bucket (`s3:PutObject`/`GetObject`/
`DeleteObject`), preencher as envs. [[m3-04-anexo-comprovante-app]] pode
começar assim que isso acontecer — o client já está pronto.
