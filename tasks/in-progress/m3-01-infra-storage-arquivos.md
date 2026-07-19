# M3-01 — Infra de storage de arquivos (S3/R2)

**Status:** 🟡 Em andamento.

## Contexto

Fundação técnica pro anexo de comprovante nas transações
([[m3-04-anexo-comprovante-app]] e [[m3-05-anexo-comprovante-whatsapp]]).
O spec (seção Milestones) cita "storage S3/R2" sem decidir entre os dois —
ambos falam a mesma API (S3-compatible), então o client de aplicação é o
mesmo independente da escolha.

**Decisão (2026-07-19):** AWS S3 planejado inicialmente; **atualizado no
mesmo dia pra Cloudflare R2** direto (o código não muda entre um e outro —
só valor de env). Client via `@aws-sdk/client-s3` (SDK oficial, fala a API
S3 tanto com a AWS quanto com R2 trocando só o `endpoint`) +
`@aws-sdk/s3-request-presigner` pras URLs assinadas. Nomes de env
**genéricos** (`STORAGE_*`, nunca `AWS_*`) — troca de provedor S3-compatible
no futuro é só valor de env, zero mudança de código.

## Escopo

### Backend
- Client de storage atrás de um port — `upload(key, buffer, contentType)`,
  `getSignedReadUrl(key, ttlSeconds)` (leitura temporária, não expor bucket
  público), `delete(key)`.
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

**Atualização (2026-07-19, mesmo dia):** extraído de `apps/backend/src/infra/storage/`
pro pacote `packages/storage` (`@finance/storage`), seguindo o padrão de
monorepo do eco-system-sales — pacote expõe port + implementação real +
test double + fragmento de env, e o app consumidor compõe/valida tudo no
próprio boot. Mesmo modelo que `@finance/queues` já usava aqui (interface
`QueueDispatcher` exportada do pacote, não do app).

- `@finance/storage` (`packages/storage/src/`):
  - `storage.ts` — port `Storage`: `upload(key, body, contentType)`,
    `getSignedReadUrl(key, ttlSeconds)`, `delete(key)`. A regra de
    nomeação de `key` (ex.: `{workspaceId}/{transactionId}/{uuid}.{ext}`)
    é responsabilidade de quem chama (M3-04/M3-05) — o port em si é
    genérico, não sabe de transação/workspace.
  - `env.ts` — exporta `storageEnvSchema` (fragmento zod, sem parse
    próprio): `STORAGE_BUCKET` tem nome padrão do projeto —
    `finance-storage` em produção (`NODE_ENV=production`) ou
    `finance-storage-dev` fora dela (sufixo de ambiente pra não misturar
    upload de teste com o de produção no mesmo bucket, mesmo padrão de
    eco-system-sales) — só precisa digitar se quiser um nome diferente do
    padrão. `STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY`
    obrigatórios (sem default possível, são credenciais). `STORAGE_REGION`
    opcional (default `"auto"` — R2 ignora o valor; só importa numa AWS S3
    real). `STORAGE_ENDPOINT` obrigatório na prática pro R2 (aponta pro
    domínio da conta) mas opcional no schema (fica vazio numa AWS S3
    real). `STORAGE_FORCE_PATH_STYLE` (default `false`) só relevante em
    provedores sem virtual-hosted-style — R2 funciona com `false`.
  - `s3-storage.ts` — `createS3Storage(config)`, via `@aws-sdk/client-s3`
    (`PutObjectCommand`/`GetObjectCommand`/`DeleteObjectCommand`) +
    `@aws-sdk/s3-request-presigner` (`getSignedUrl`). Config recebida
    explícita (já validada por quem chama) — o pacote não lê
    `process.env` sozinho.
  - `in-memory-storage.ts` — test double (`Map`), mesmo padrão de
    `infra/cache`/`infra/ai` do backend.
- **Mudança de filosofia de env (decisão de 2026-07-19):** diferente do
  resto das integrações do backend (`infra/ai`, `infra/whatsapp`, que
  validam a própria env só no primeiro uso real), `apps/backend/src/main/
  env.ts` agora importa e espalha `storageEnvSchema.shape` no schema
  principal — `STORAGE_*` passa a ser validado no **boot** junto com
  `JWT_SECRET`/`REDIS_URL`/etc. O backend não sobe mais sem essas envs
  preenchidas. Escolha explícita do usuário pra alinhar com o padrão do
  eco-system-sales, mesmo sabendo que isso quebra a consistência com as
  demais integrações opcionais deste backend.
- `storage: Storage` em `UseCaseDeps` (`application/deps.ts` importa o
  tipo de `@finance/storage`, não mais de um port local) — nasce pronto
  pra [[m3-04-anexo-comprovante-app]] plugar sem refatoração.
  `main/composition.ts` chama `createS3Storage({ bucket, region,
  accessKeyId, secretAccessKey, endpoint, forcePathStyle })` com os
  valores já validados de `env`; `test/deps.ts` usa
  `createInMemoryStorage()` do mesmo pacote. Limite de tamanho/tipo de
  arquivo fica pra [[m3-04-anexo-comprovante-app]] (é regra de validação
  na borda da rota de upload, não do client de storage em si).

## Testes

`packages/storage/src/in-memory-storage.test.ts` (3 casos, agora rodando
dentro do próprio pacote via `bun --cwd=packages/storage test`): upload +
leitura, leitura de chave inexistente falha, delete remove a chave.
Typecheck limpo em `packages/storage` e em `apps/backend`. Suíte completa
do backend não pôde ser re-rodada de ponta a ponta nesta sessão (Postgres
local fora do ar — Docker Desktop não estava rodando), mas isso é
ambiente, não código: nenhum teste dependente de Postgres foi tocado por
essa extração. **Não validado contra o R2 real** — bucket/credenciais
ainda não configurados neste ambiente.

## Próximo passo

Pra validar de verdade: criar no Cloudflare R2 os buckets `finance-storage`
(produção) e `finance-storage-dev` (default automático fora de produção —
não precisa digitar `STORAGE_BUCKET`), gerar um R2 API Token com permissão
restrita a esses buckets (Object Read & Write), preencher as envs
(`STORAGE_ENDPOINT` com o Account ID, `STORAGE_ACCESS_KEY_ID`/
`STORAGE_SECRET_ACCESS_KEY` do token — `STORAGE_REGION` pode ficar vazio,
usa o default `"auto"`). [[m3-04-anexo-comprovante-app]] pode começar
assim que isso acontecer — o client já está pronto.
