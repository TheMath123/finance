# Backlog de tasks

## Organização das pastas

- `tasks/` (raiz) — tasks do milestone atualmente em planejamento, ainda
  não iniciadas.
- `tasks/in-progress/` — o que está sendo implementado agora. Deve ter no
  máximo um punhado de arquivos por vez (idealmente 1) — é o "o que estou
  fazendo", não uma fila.
- `tasks/done/` — concluídas e validadas (código + testes + integração
  mobile quando aplicável), independente de qual milestone.
- `tasks/backlog/` — decidido que não é pra agora: bloqueada por algo
  externo (ex.: [[m2-06b-whatsapp-grupo-workspace]], que depende de status
  OBA da Meta), ou adiada por decisão de produto.
- `tasks/validations/` — código já implementado e testado (diferente de
  `backlog/`), mas que precisa de **revalidação manual** condicionada a
  uma liberação de terceiro (ex.: aprovação de App Review da Meta, mudança
  de política de uma API externa). Sai daqui e vai pra `done/` quando a
  liberação acontecer **e** a revalidação manual listada no arquivo for
  feita — não basta o terceiro liberar, precisa confirmar que o
  comportamento real bate com o testado antes.

Fluxo normal de uma task: nasce em `tasks/` (raiz) durante o planejamento
do milestone → move pra `in-progress/` quando a implementação começa →
move pra `done/` quando termina e é validada, **ou** pra `backlog/` se
travar em algo fora do nosso controle antes de terminar, **ou** pra
`validations/` se o código já estiver pronto mas precisar de liberação de
terceiro antes da validação final. Essa convenção está documentada também
no `spec.md` (seção "Processo de tasks").

## M2 — compartilhamento + chatbot WhatsApp + IA + infra assíncrona

Concluído em 2026-07-19. Definido a partir da leitura do `spec.md` em
2026-07-16, logo após o fechamento e validação do M1. Ordem de execução:
infra (M2-01) primeiro, compartilhamento (M2-02/03/04) em seguida,
WhatsApp (M2-05/06) depois, IA (M2-07/08) por último entre as grandes, e
as independentes (M2-09/10/11/12) encaixaram onde sobrou capacidade.

| # | Tarefa | Status | Depende de |
|---|---|---|---|
| M2-01 | [Infra Redis + BullMQ](done/m2-01-infra-redis-bullmq.md) | 🟢 Concluída | — |
| M2-02 | [Workspaces compartilhados (convites, papéis, seletor)](done/m2-02-workspaces-compartilhamento.md) | 🟢 Concluída | — |
| M2-03 | [Enforcement de limite de plano](done/m2-03-enforcement-plano.md) | 🟢 Concluída | M2-02 |
| M2-04 | [Atividade do workspace (leitura do AuditLog)](done/m2-04-atividade-audit-log.md) | 🟢 Concluída | M2-02 |
| M2-05 | [Vínculo do WhatsApp por OTP](done/m2-05-whatsapp-vinculo-otp.md) | 🟢 Concluída | — |
| M2-06 | [Chatbot WhatsApp: webhook Meta Cloud API](done/m2-06-whatsapp-webhook-chatbot.md) | 🟢 Concluída (1:1) | M2-01, M2-05 |
| M2-06b | [Vínculo de grupo do WhatsApp a workspace](backlog/m2-06b-whatsapp-grupo-workspace.md) | ⚪ Bloqueada (precisa de OBA no número) | M2-06 |
| M2-07 | [Pipeline de IA: interpretar/categorizar transações](done/m2-07-ia-pipeline-transacoes.md) | 🟢 Concluída (falta validar com API key real; migrado pra OpenRouter) | — (valor pleno com M2-06) |
| M2-08 | [Previsão de gastos variáveis](done/m2-08-ia-previsao-gastos.md) | 🟢 Concluída | — |
| M2-09 | [Auto-lançamento de recorrências (job)](done/m2-09-auto-lancamento-recorrencias.md) | 🟢 Concluída | M2-01 |
| M2-10 | [Sistema de notificações + push](done/m2-10-notificacoes-push.md) | 🟢 Concluída | M2-01 |
| M2-11 | [Export CSV (LGPD)](done/m2-11-export-csv-lgpd.md) | 🟢 Concluída | — |
| M2-12 | [Biometria para abrir o app](done/m2-12-biometria-app.md) | 🟢 Concluída | — |

**Legenda:** 🔵 Backlog (não iniciada) · 🟡 Em andamento · 🟢 Concluída/decidida · ⚪ Bloqueada

## Backlog adiado (decisões de produto do M1, fora do escopo do M2/M3)

- [01 — Widget de tela inicial (Android)](backlog/01-widget-tela-inicial.md): o
  bloqueio original (precisar de dev build) **foi resolvido** na M2-10 —
  `expo prebuild`/`android/` já existem. O widget em si continua não
  implementado, mas não tem mais pré-requisito técnico pendente.
- [03 — Onboarding guiado](backlog/03-onboarding-guiado.md): decidido manter o
  comportamento silencioso atual por enquanto.

## M3 — camada social + anexo de comprovante

Concluído em 2026-07-24. Planejado em 2026-07-19, logo após o fechamento
do M2. Modelos de dados (`InterUserTransfer`, `TrustedContact`,
`ExpenseSplit`, `SplitShare`) já vinham fechados desde o spec original —
faltava só quebrar em tasks. Ordem sugerida: M3-01 (storage) primeiro só
por ser pré-requisito do anexo de comprovante; M3-02 e M3-03 são
independentes entre si e do storage, dá pra fazer em paralelo ou em
qualquer ordem; M3-04 depende do M3-01; M3-05 depende do M3-01 e do
M3-04.

| # | Tarefa | Status | Depende de |
|---|---|---|---|
| M3-01 | [Infra de storage de arquivos (S3/R2)](done/m3-01-infra-storage-arquivos.md) | 🟢 Concluída (validada ponta a ponta contra o R2 real em 2026-07-20) | — |
| M3-02 | [Transferência entre usuários + contato confiável](done/m3-02-transferencia-entre-usuarios.md) | 🟢 Concluída | M2-10 |
| M3-03 | [Split de despesas](done/m3-03-split-despesas.md) | 🟢 Concluída | M2-10 |
| M3-04 | [Anexo de comprovante nas transações (app)](done/m3-04-anexo-comprovante-app.md) | 🟢 Concluída (2026-07-21, validada no app rodando de verdade) | M3-01 |
| M3-05 | [Anexo de comprovante via WhatsApp (foto no chatbot)](done/m3-05-anexo-comprovante-whatsapp.md) | 🟢 Concluída (2026-07-24, foto real confirmada pelo usuário) | M3-01, M3-04, M2-06 |

Cada task tem uma seção "Próximo passo"/"Validação final" com as decisões
de produto fechadas ao longo do caminho — vale ler antes de mexer nessa
área depois (se split pode ser editado depois de criado, limite de
tamanho de arquivo, janela de associação foto→transação no WhatsApp).
M3-01 decidiu usar **Cloudflare R2** direto (client S3-compatible
genérico, extraído pro pacote `@finance/storage` — nomes de env sem
"AWS"/"R2" pra não precisar renomear numa troca futura de provedor);
M3-02 já fechou o prazo de expiração da transferência em 30 dias (spec);
M3-03 decidiu que split criado só pode ser cancelado (nunca editado), e
só enquanto nenhuma parte foi paga/confirmada; M3-04 decidiu só aceitar
imagem (sem PDF) até virar necessidade real, limite de 5MB; M3-05 fechou
a janela de associação foto→transação em 5 minutos.

[[meta-app-review-whatsapp-business-messaging]] em `validations/` segue
cobrindo a revalidação que falta depois que a Meta aprovar o App Review —
hoje o número roda em Development Mode, só testadores cadastrados
conseguem usar o chatbot (M2-06) e o anexo via WhatsApp (M3-05); isso não
bloqueou o fechamento do M3 porque o próprio usuário já é testador
cadastrado.

## Fora dos milestones numerados

- [UI — migração pro novo padrão visual (Figma)](in-progress/ui-novo-padrao-figma.md):
  Fases 1 e 2 (fundação + Home/Transações do app mobile) concluídas e
  validadas em 2026-07-24. Fase 3 (logo de marca via thesvg.org) implementada
  de carona durante o M4 — código pronto, falta validação manual no
  emulador.
- [M5-01 — Calculadora de fórmulas customizadas (dashboard web)](done/m5-01-calculadora-formulas-dashboard.md):
  concluída em 2026-07-26 (não é o escopo original de M5 no `spec.md`,
  que é workspaces corporativos — ficou com esse rótulo desde que virou
  nota de backlog). Inclui pacote novo `@finance/formula` (parser/
  avaliador de expressão puro, reaproveitado por backend e dashboard, e
  agora também pelo app mobile).
- [M5-01b — Calculadora de fórmulas customizadas (app mobile)](done/m5-01b-calculadora-formulas-mobile.md):
  fase 2 do M5-01, concluída em 2026-07-28. Mesmo `@finance/formula`,
  teclado numérico on-screen (sem digitação livre, diferente do
  dashboard), tela própria `/formulas` + widget de fórmulas fixadas na
  Home e em Transações.
- [M5-01c — Calculadora: catálogo estendido, exibição agrupada e reorder](done/m5-01c-calculadora-catalogo-reorder.md):
  concluída em 2026-07-28. Variáveis por conta/cartão/método de pagamento,
  chips agrupados e truncados (dashboard + mobile), e reorder por
  drag-and-drop dos widgets fixados (`svelte-dnd-action` no dashboard,
  `react-native-draggable-flatlist` no mobile). Smoke test manual e
  validação do drag na Home mobile (lista aninhada em ScrollView) ainda
  pendentes de verificação hands-on.
- [M5-02 — Planos, preços, limites e controle de assinatura por workspace](done/m5-02-planos-precos-limites.md):
  concluída em 2026-07-30, validada ponta a ponta com curl real. Gap
  registrado desde o fechamento do M4 (plano era só um enum decorativo sem
  preço/limite real) — virou tabela `plans` editável pelo superadmin
  (preço, intervalo de cobrança configurável, limites, features por plano),
  substituindo `FREE_PLAN_LIMITS` hardcoded nos 4 pontos de enforcement.
  Controle manual de plano por workspace (`/saas/workspaces`) e visão do
  plano por usuário (`/saas/users`) — sem Stripe ainda (fase 2 é M5-03).
- [M5-03 — Preços múltiplos por plano, trial e feature-lock unificado com feature flags](done/m5-03-precos-multiplos-trial-feature-flags.md):
  concluída em 2026-07-30, validada ponta a ponta com curl real. Um plano
  passou a ter N opções de cobrança (`plan_prices`: mensal/semestral/anual,
  cada uma com preço/parcelamento/métodos aceitos), trial configurável por
  plano (`trialDays`, baseado só em tempo — sem job, cai pro free quando
  vence) e `plans.features` passou a exigir chaves existentes em
  `feature_flags` (unifica os dois vocabulários). Autoatendimento (usuário
  comum trocar o próprio plano) documentado à parte, sem implementar
  (M5-04). Ainda sem Stripe.
- [M5-05 — Integração Stripe (checkout + Customer Portal) e autoatendimento de plano](done/m5-05-integracao-stripe.md):
  concluída em 2026-07-31, validada ponta a ponta contra backend + dashboard
  rodando. Absorveu o M5-04 (autoatendimento) junto — Stripe Checkout
  hospedado pra assinar, Stripe Customer Portal hospedado pra trocar/
  cancelar/atualizar cartão (sem UI customizada). Webhook sincroniza
  `subscriptionStatus`/trial/período pago; `resolveEffectivePlan` agora
  também cai pro free quando a assinatura é cancelada de verdade via
  Stripe, além do trial baseado em tempo do M5-03. **Smoke test com Stripe
  de verdade (conta ainda não existe) fica pendente** — todo o resto foi
  validado com um gateway fake.
- [M5-06 — Auth em padrão OAuth + login social com Google (Fase 1: backend + dashboard)](done/m5-06-oauth-login-social-google.md):
  concluída em 2026-08-14, validada com testes reais contra Postgres +
  typecheck/lint/build em backend e dashboard. Backend só valida o ID
  token (Google Identity Services no browser) — nenhum client secret,
  nenhum redirect OAuth conduzido pelo backend; tabela nova
  `oauth_accounts` (não campo em `users`) já deixa multi-provedor barato.
  E-mail do Google que já tem conta por senha é rejeitado (pede login com
  senha ou reset) — vínculo manual fica pra depois. Fase 2 (mobile) em
  [`backlog/m5-06b-google-login-mobile.md`](backlog/m5-06b-google-login-mobile.md),
  bloqueada esperando o usuário criar Client IDs iOS/Android no Google
  Cloud Console.

## M4 — Dashboard web (Svelte)

Concluído em 2026-07-25. Planejado em 2026-07-24, logo após o fechamento
do M3. `spec.md`
("Dashboard web") já fecha a stack (Svelte + Bits UI + Tailwind + Zod) e o
conceito de `platformRole`/superadmin, mas não detalha telas — esta
quebra em tasks é a especificação real do milestone. Ordem sugerida:
M4-01 (scaffold + auth) é pré-requisito de tudo; M4-02 a M4-06 espelham
telas que o app mobile já tem (workspace, CRUD financeiro, faturas/visão
mensal, configurações — puramente frontend, backend já existe pra todas);
M4-07 a M4-09 são a área de superadmin, nova mesmo no backend
(`platformRole` existe no schema desde o M1 mas nunca foi usado por
nenhuma rota).

| # | Tarefa | Status | Depende de |
|---|---|---|---|
| M4-01 | [Scaffold do dashboard web + autenticação](done/m4-01-scaffold-dashboard-web.md) | 🟢 Concluída (2026-07-24, login validado pelo usuário) | — |
| M4-02 | [Layout base + workspaces (seletor, membros, convites)](done/m4-02-layout-workspaces-dashboard.md) | 🟢 Concluída (2026-07-24, validada pelo usuário) | M4-01 |
| M4-03 | [CRUD de bancos, contas e cartões](done/m4-03-bancos-contas-cartoes-dashboard.md) | 🟢 Concluída (2026-07-24) | M4-02 |
| M4-04 | [Transações (listagem, filtros, criar/editar)](done/m4-04-transacoes-dashboard.md) | 🟢 Concluída (2026-07-24, validada pelo usuário) | M4-03 |
| M4-05 | [Faturas por cartão + visão mensal](done/m4-05-faturas-visao-mensal-dashboard.md) | 🟢 Concluída (2026-07-24) | M4-04 |
| M4-06 | [Configurações de conta](done/m4-06-configuracoes-conta-dashboard.md) | 🟢 Concluída (2026-07-24) | M4-01 |
| M4-07 | [Superadmin: fundação (guard + layout admin)](done/m4-07-superadmin-fundacao.md) | 🟢 Concluída (2026-07-24, validada ponta a ponta) | M4-01 |
| M4-08 | [Superadmin: usuários + categorias padrão](done/m4-08-superadmin-usuarios-categorias.md) | 🟢 Concluída (2026-07-25, validada ponta a ponta) | M4-07 |
| M4-09 | [Superadmin: guardrails de IA, feature flags, métricas](done/m4-09-superadmin-ia-flags-metricas.md) | 🟢 Concluída (2026-07-25, validada ponta a ponta) | M4-07 |
| M4-10 | [Notificações no dashboard (paridade com o mobile)](done/m4-10-notificacoes-dashboard.md) | 🟢 Concluída (2026-07-25, validada com SSE real) | M4-01 |

Decisões de arquitetura já identificadas (cada task detalha o porquê):
CORS precisa ser adicionado ao backend (nunca precisou pra servir só o
app mobile); estratégia de sessão web (cookie `httpOnly` recomendado,
sem mudar o contrato de login do backend); orçamento de tokens de IA e
categorias padrão do seed precisam sair de constante/env estáticos pra
tabela no banco pra virarem editáveis pelo painel (gap identificado no
M4-08/M4-09); `User` não tem campo de suspensão ainda (gap do M4-08).

M4-06 é independente do resto (só depende do M4-01) — dá pra fazer em
paralelo a qualquer uma das outras. M4-08 e M4-09 também são
paralelizáveis entre si (ambas só dependem do M4-07).

## Histórico do M1

Tarefas do M1 já concluídas/decididas — ver [`done/`](done/). A antiga task
05 (enforcement de plano) foi arquivada lá com uma nota apontando pra M2-03,
que é a implementação real.
