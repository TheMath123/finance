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

Fluxo normal de uma task: nasce em `tasks/` (raiz) durante o planejamento
do milestone → move pra `in-progress/` quando a implementação começa →
move pra `done/` quando termina e é validada, **ou** pra `backlog/` se
travar em algo fora do nosso controle antes de terminar. Essa convenção
está documentada também no `spec.md` (seção "Processo de tasks").

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

## Próximo milestone

M3 (camada social — transferências entre usuários, split de despesas,
anexo de comprovante) ainda não foi quebrado em tasks individuais. Ver
`spec.md`, seção Milestones.

## Histórico do M1

Tarefas do M1 já concluídas/decididas — ver [`done/`](done/). A antiga task
05 (enforcement de plano) foi arquivada lá com uma nota apontando pra M2-03,
que é a implementação real.
