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

## Próximo passo

Resolvido — ver decisão acima. Falta só o usuário criar o bucket S3 na AWS
e gerar as credenciais (`STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY`)
antes de dar pra testar contra a conta real (mesmo padrão de toda env
externa neste projeto: o código sobe sem a chave configurada, só falha no
primeiro uso real).
