# Backlog M2

Índice das tarefas do Milestone 2 (compartilhamento de workspace + chatbot
WhatsApp com IA + infra assíncrona + push/CSV/biometria), definidas a partir
da leitura do `spec.md` em 2026-07-16, logo após o fechamento e validação do
M1. Ordem sugerida de execução: a infra (M2-01) primeiro, compartilhamento
(M2-02/03/04) em seguida, WhatsApp (M2-05/06) depois, IA (M2-07/08) por
último entre as grandes, e as três independentes (M2-09/10/11/12) encaixam
onde sobrar capacidade.

| # | Tarefa | Status | Depende de |
|---|---|---|---|
| M2-01 | [Infra Redis + BullMQ](m2-01-infra-redis-bullmq.md) | 🟢 Concluída | — |
| M2-02 | [Workspaces compartilhados (convites, papéis, seletor)](m2-02-workspaces-compartilhamento.md) | 🟢 Concluída | — |
| M2-03 | [Enforcement de limite de plano](m2-03-enforcement-plano.md) | 🟢 Concluída | M2-02 |
| M2-04 | [Atividade do workspace (leitura do AuditLog)](m2-04-atividade-audit-log.md) | 🟢 Concluída | M2-02 |
| M2-05 | [Vínculo do WhatsApp por OTP](m2-05-whatsapp-vinculo-otp.md) | 🟢 Concluída | — |
| M2-06 | [Chatbot WhatsApp: webhook Meta Cloud API](m2-06-whatsapp-webhook-chatbot.md) | 🟢 Concluída (1:1; grupo pausado) | M2-01, M2-05 |
| M2-07 | [Pipeline de IA: interpretar/categorizar transações](m2-07-ia-pipeline-transacoes.md) | 🟢 Concluída (falta validar com API key real; migrado pra OpenRouter) | — (valor pleno com M2-06) |
| M2-08 | [Previsão de gastos variáveis](m2-08-ia-previsao-gastos.md) | 🟢 Concluída | — |
| M2-09 | [Auto-lançamento de recorrências (job)](m2-09-auto-lancamento-recorrencias.md) | 🟢 Concluída | M2-01 |
| M2-10 | [Sistema de notificações + push](m2-10-notificacoes-push.md) | 🟢 Concluída | M2-01 |
| M2-11 | [Export CSV (LGPD)](m2-11-export-csv-lgpd.md) | 🔵 Backlog | — |
| M2-12 | [Biometria para abrir o app](m2-12-biometria-app.md) | 🔵 Backlog | — |

**Legenda:** 🔵 Backlog (não iniciada) · 🟡 Em andamento · 🟢 Concluída/decidida · ⚪ Bloqueada

## Backlog adiado (fora do escopo do M2)

Decisões de produto tomadas no M1, sem relação com o escopo do M2 do spec —
não fazem parte desta leva, ficam aqui só pra não se perder:

- [01 — Widget de tela inicial (Android)](01-widget-tela-inicial.md): o
  bloqueio original (precisar de dev build) **foi resolvido** na M2-10 —
  `expo prebuild`/`android/` já existem. O widget em si continua não
  implementado, mas não tem mais pré-requisito técnico pendente.
- [03 — Onboarding guiado](03-onboarding-guiado.md): decidido manter o
  comportamento silencioso atual por enquanto.

## Histórico do M1

Tarefas do M1 já concluídas/decididas — ver [`done/`](done/). A antiga task
05 (enforcement de plano) foi arquivada lá com uma nota apontando pra M2-03,
que é a implementação real.
