# Backlog M1 — o que falta pra fechar 100% o milestone

Consolidado em 2026-07-15 a partir de auditoria de 2 agents (endpoints não integrados
ao app + checklist do M1 contra `spec.md`). Itens abaixo são o que **sobra depois** da
leva de integrações feita nesta mesma data (logout, esqueci/redefinir senha, verificar
e-mail, lixeira de transações — ver commits do dia). Cada item tem contexto suficiente
pra ser retomado sem precisar reabrir a auditoria original.

## 1. Widget de tela inicial (Android)

**Status:** não iniciado — zero código, zero dependência instalada.

A spec (visão geral + milestone M1) descreve um widget de resumo financeiro (saldo +
próxima fatura) usando `react-native-android-widget` (JSX → RemoteViews), com cache local
(AsyncStorage) atualizado pelo app + `requestWidgetUpdate()`. Pré-requisito: dev build
via `expo prebuild` (Expo Go não suporta widget) — hoje o app roda em Expo Go/dev, então
isso também precisa ser resolvido primeiro (gerar as pastas nativas `ios`/`android`, que
hoje são geradas mas não versionadas — ver `.gitignore` do app: `/ios`, `/android`).

**Por que é o maior gap:** é o item mais citado na spec e o único 100% ausente do código.

**Próximo passo sugerido:** decidir se vale ser feito agora (exige sair do fluxo puro
Expo Go pra um dev build) ou empurrar pra depois do M1 fechar o resto — o widget não
bloqueia nenhuma outra funcionalidade financeira do app.

## 2. Filtros completos na lista de transações

**Status:** parcial — backend e índices já suportam tudo (`from`, `to`, `accountId`,
`cardId`, `createdBy`), só a UI usa só `q` (texto) e `categoryId`.

A spec (seção Funcionalidades > App) promete busca por "texto, período, categoria,
conta/cartão e membro do workspace". `apps/mobile/src/app/(app)/explore.tsx` só expõe
2 dos 5 filtros no momento.

**Próximo passo sugerido:** adicionar na tela de Transações: seletor de período (usar
o `DateField`/`DatePicker` já existente, um range de duas datas), seletor de conta/cartão
(reusar o padrão de `SelectField`), e filtro por membro (`createdBy`) — relevante só
quando workspace for compartilhado (M2), então pode esperar até lá sem problema.
Esforço baixo: é só UI, o backend não muda nada.

## 3. Onboarding guiado (hoje é silencioso)

**Status:** parcial — banco/conta/categorias padrão já são criados automaticamente no
registro (`apps/backend/.../auth/register.ts`), mas sem nenhuma tela guiando o usuário
a personalizar isso.

**Próximo passo sugerido:** decidir se vale um fluxo de "boas-vindas" (2-3 telas) logo
após o primeiro registro, convidando o usuário a renomear a conta padrão, criar o
primeiro cartão, etc. — ou se o comportamento silencioso atual (usuário já cai direto
no Resumo com uma conta zerada pronta pra uso) é suficiente pro M1. Não é bloqueante.

## 4. Tela de Configurações — exclusão de conta (LGPD)

**Status:** logout já sai desta leva de integrações (ver commit do dia). Falta ainda:
exclusão de conta com confirmação forte, que a spec cita explicitamente como parte do
M1 ("Configurações" — LGPD, exclusão em cascata).

**Próximo passo sugerido:** o backend precisa de uma rota `DELETE /users/me` (ou
semelhante) com cascade — **confirmar se essa rota já existe no backend antes de
começar** (não foi verificado nesta auditoria). Se não existir, é trabalho de
backend + mobile juntos: endpoint com confirmação de senha, cascade de todos os dados
do workspace pessoal, revogação de tokens, e-mail de confirmação. Tela mobile: campo de
senha + texto de confirmação (ex.: digitar "excluir") antes de habilitar o botão.

## 5. Enforcement de limite de plano (workspace free/premium)

**Status:** campo `plan` existe no schema (`packages/db/src/schema/workspace.ts`), mas
nada aplica o limite ainda — e nem faz muita diferença hoje porque não existe rota pra
criar um segundo workspace (isso só chega no M2, com compartilhamento).

**Próximo passo sugerido:** baixa prioridade agora. Só vira relevante quando a rota de
criar/convidar pra workspace adicional existir (M2) — nesse momento, checar o limite de
membros (5) e de workspaces compartilhados antes de liberar a ação.

## 6. Módulo `bank` do backend — decidir o destino

**Status:** as 6 rotas (`GET/POST/PATCH/DELETE/archive/unarchive` de bank) ficaram
órfãs depois da decisão de 2026-07-15 de tirar a gestão manual de banco do app (conta/
cartão agora mandam `bankCode` direto, o backend resolve/cria o `Bank` por trás via
`findOrCreateBank`).

**Próximo passo sugerido:** não é urgente (não atrapalha nada rodando), mas vale uma
decisão consciente: manter as rotas de CRUD de bank pro futuro dashboard web (M4,
gestão administrativa) ou removê-las por não terem consumidor nenhum hoje. Recomendo
manter — custo de manutenção é baixo e podem ser úteis pro admin do M4.

## 7. Deep link para os e-mails de auth (reset de senha / verificação de e-mail)

**Status:** as telas de "esqueci minha senha"/"redefinir senha"/"verificar e-mail"
(desta leva de integrações) usam **entrada manual do token colado** — os e-mails
enviados pelo backend apontam pra `${APP_URL}/reset-password?token=...` e
`.../verify-email?token=...`, que hoje não é nem uma página web (não existe dashboard
ainda) nem um deep link do app mobile (`scheme: "mobile"` já configurado em
`app.json`, mas os templates de e-mail não usam esse scheme).

**Próximo passo sugerido:** trocar a construção do link nos e-mails
(`apps/backend/src/application/use-cases/auth/{forgot-password,register}.ts`) pra usar
o deep link do app (`mobile://reset-password?token=...`) em vez de `APP_URL`, e
configurar o `expo-router` pra capturar esse link e abrir a tela certa com o token
pré-preenchido (mantendo o campo editável como fallback). Decisão de produto: talvez
valha esperar até existir uma landing page web (M4) que funcione nos dois casos
(quem abre no celular vs. no desktop) antes de investir nisso.

---

## Já confirmado como pronto (não repetir auditoria)

CRUD completo de conta/cartão/categoria/transação, faturas com pagamento, recorrências
com confirmação de ocorrência, previsão determinística (`projectedAvailable`), AuditLog
write-only, `platform_role`/`workspace_type` já no schema pro M4/M5 — tudo confirmado
lendo o código real em 2026-07-15.
