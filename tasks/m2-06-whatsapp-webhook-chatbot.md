# M2-06 — Chatbot WhatsApp: webhook Meta Cloud API + grupos↔workspace

**Status:** 🟡 Em andamento — conversa privada (1:1) concluída; grupos pausados (ver abaixo).

## Contexto

Núcleo do canal WhatsApp (spec, seção "Chatbot WhatsApp" + "Meta Cloud API
(oficial)" em Decisões de arquitetura). A Meta exige resposta rápida ao
webhook — por isso o processamento real acontece assíncrono via
[[m2-01-infra-redis-bullmq]].

## Descoberta (2026-07-16): grupos pausados — Groups API exige OBA

A Groups API oficial do WhatsApp Cloud API (lançada fev/2026) só funciona em
números com status **Official Business Account (OBA)** — números comuns do
WhatsApp Business app e números de teste comuns não são suportados. O
número de teste do usuário ainda não tem OBA. Decisão: pausar o vínculo de
grupo ([[m2-05-whatsapp-vinculo-otp]] cobre só o vínculo individual) —
task arquivada como "[Pausada]" no backlog, retomada se/quando o número
ganhar OBA. Esta task cobre só conversa privada por enquanto.

## Implementação (conversa privada)

### Backend
- `apps/backend/src/infra/whatsapp/env.ts` — env lazy (mesmo padrão de
  `packages/email/src/env.ts`): `WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
  Não entra no boot-time `main/env.ts` — só valida no primeiro uso, pra não
  quebrar o boot do backend em quem ainda não configurou.
- `apps/backend/src/infra/whatsapp/meta-cloud-api.ts` — `sendWhatsAppText`
  (POST cru via `fetch`, sem `expo-server-sdk`-like dependency extra),
  `verifyWebhookChallenge` (GET, `hub.mode`/`hub.verify_token`),
  `verifyWebhookSignature` (HMAC-SHA256 do corpo cru via `Bun.CryptoHasher`,
  comparação `timingSafeEqual`). Testado isoladamente
  (`meta-cloud-api.test.ts`, 6 casos, sem rede).
- `apps/backend/src/http/modules/whatsapp/routes/webhook.ts`:
  `GET /whatsapp/webhook` (verificação) e `POST /whatsapp/webhook` (valida
  assinatura, responde 200 sem esperar o dispatch — `void dispatch(...)`,
  não `await`, pra não violar o "responder rápido" da Meta mesmo se
  Redis estiver lento).
- `apps/backend/src/application/use-cases/whatsapp/handle-inbound-message.ts`
  (`handleInboundWhatsAppMessage`): decide a resposta (número não vinculado +
  código de 6 dígitos → tenta confirmar; não vinculado + outro texto →
  instrução de vínculo; vinculado → placeholder, a interpretação de
  linguagem natural é a [[m2-07-ia-pipeline-transacoes]]). Não fala com a
  Meta diretamente — só retorna `{to, body}`; quem envia é o job handler
  (mesmo padrão do e-mail: use-case dispara/decide, `mailer`/`sendWhatsAppText`
  só são chamados no `main/job-handlers.ts`).
- `packages/queues/src/jobs.ts` — novo job `whatsapp.inbound-message`.
- `apps/backend/src/main/job-handlers.ts` — virou fábrica
  (`createJobHandlers(deps)`, antes era objeto estático) porque o handler do
  WhatsApp precisa de `repos`/`uow`/`rateLimiter`/`tokens` (pra
  `confirmWhatsAppLink`), que os handlers de e-mail/push não precisavam.
- `apps/backend/src/main/worker.ts` — monta as deps completas (antes só
  tinha `repos`/`uow`/`dispatch` pro sweep; agora soma `rateLimiter`/`tokens`)
  e usa `createJobHandlers(deps)`.
- Testes: `whatsapp.test.ts` ganhou 4 casos de roteamento de mensagem
  recebida; `meta-cloud-api.test.ts` (novo) cobre verificação/assinatura do
  webhook isoladamente. Suíte completa: 70/70.

### Pendente (fora desta etapa)
- Registrar o webhook de verdade no painel do Meta (precisa do túnel
  cloudflared do usuário + envs reais no `.env`) e validar ponta-a-ponta com
  uma mensagem real.
- Interpretação de linguagem natural (M2-07) — hoje número vinculado só
  recebe uma resposta de placeholder.
- Vínculo de grupo (pausado, ver acima).

## Dependências

[[m2-01-infra-redis-bullmq]] (processamento assíncrono) e
[[m2-05-whatsapp-vinculo-otp]] (só aceitar mensagem de número vinculado) —
ambas concluídas.
