# Finance Eco System

## Visão geral

Um ecossistema completo de organização de finanças pessoais e compartilhadas, composto por:

- **App mobile** (Android, com widget de tela inicial);
- **Dashboard web** (milestone futuro);
- **Chatbot no WhatsApp** (conversa privada ou grupo);
- **Backend** que orquestra todos os clients.

O fluxo central: o usuário envia uma transação pelo bot do WhatsApp (ex.: "gastei 50 no mercado no nubank"), o backend interpreta, categoriza e salva a transação na conta dele. O número de telefone é vinculado à conta da plataforma por um fluxo OTP seguro iniciado no app (ver "Segurança: fluxos de autenticação").

Os dados financeiros vivem em **workspaces**, que podem ser pessoais ou compartilhados (família, empresa) — ver a seção "Workspaces e compartilhamento".

## Funcionalidades

### Comum

- Sistema de autenticação para o usuário.
- Todo dado financeiro pertence a um workspace; o usuário pode participar de vários e alternar entre eles.
- Tratamento de erros eficiente e consistente em todas as camadas.
  - Deve utilizar `Either` (sucesso/falha tipados, sem exceptions para fluxo de negócio).

### App

- Telas de CRUD para bancos, contas, cartões e transações.
- Tela de faturas por cartão (por mês de referência, com status e total).
- Visão mensal: receitas, despesas, saldo e **disponível projetado** para os próximos meses.
- Seletor de workspace (pessoal/família/…); telas de membros e convites do workspace.
- Widget de tela inicial com **resumo financeiro** (saldo disponível + próxima fatura) do workspace ativo. Pode ser arrastado para a tela inicial ou adicionado no menu de opções.
- Todas as requisições devem ser separadas em services e organizadas.
- **UX/UI é prioridade**: visual moderno e experiência bem cuidada. O design das telas será
  trabalhado em fase própria, antes da implementação de cada tela — o spec define *quais* telas,
  não o layout.
- **Busca e filtros de transações**: por texto (descrição), período, categoria, conta/cartão e
  membro do workspace — é o uso diário do app e define os índices do banco desde o M1.
- **Onboarding**: ao criar workspace, seed de categorias padrão + criação guiada da primeira
  conta/cartão (nunca deixar o usuário numa tela vazia).
- **Configurações**: verificação de e-mail, revogação do vínculo WhatsApp (M2) e **exclusão de
  conta** com confirmação forte (LGPD).

### Dashboard web (futuro — M4)

- Citado como parte do ecossistema; será especificado quando o milestone se aproximar. A camada de services do backend é canal-agnóstica, então o dashboard consome a mesma API.
- Terá também um **modo superadmin** (ver "Papéis de plataforma" abaixo): área administrativa da plataforma para configurações globais — gestão de usuários (suspender/reativar), categorias padrão do seed, parâmetros dos guardrails de IA (orçamentos de tokens), feature flags e métricas de uso.

### Papéis de plataforma (≠ papéis de workspace)

- Todo usuário tem um `platform_role`: `user` (padrão) ou `superadmin`.
- Os papéis de workspace (owner/admin/member/viewer) valem **dentro** de workspaces; `superadmin` vale para a **plataforma** (painel administrativo do dashboard web).
- **LGPD**: superadmin administra a plataforma mas **não tem acesso aos dados financeiros dos usuários** — as rotas de domínio continuam exigindo membership no workspace, sem bypass. Ações administrativas são registradas em auditoria própria.
- Superadmin não é criável via cadastro: é atribuído por seed/manual no banco.

### Chatbot WhatsApp

- Pode ser adicionado em grupo ou usado em conversa privada, vinculado à conta do usuário pelo número de telefone.
- **Grupos do WhatsApp podem ser vinculados a um workspace** (ex.: grupo da família → workspace da família). Transações enviadas no grupo caem no workspace vinculado, com `created_by` identificando quem enviou a mensagem. Em conversa privada, a transação vai para o workspace padrão do usuário.
- Registra transações por linguagem natural; a IA interpreta valor, descrição, método e categoria.
- Guardrails de custo de tokens:
  - Não responder perguntas fora do domínio financeiro (mas recusar de forma amigável e útil).
  - Limite de tokens por requisição e por usuário.
  - Respostas curtas e objetivas.
- Deve ser capaz de se adaptar a novas formas de escrever transações (variações de linguagem, apelidos de bancos/cartões).

### Backend

- Processar e responder as mensagens do chatbot.
- Salvar e recuperar os dados financeiros dos workspaces.
- Autorização por workspace: toda operação valida se o usuário é membro e se o papel dele permite a ação.
- Usar banco de dados para persistência.
- Conter todas as políticas de segurança e autenticação necessárias.
- Respeitar a LGPD e proteger os dados do usuário (ver regras de exclusão em "Workspaces e compartilhamento"):
  - Senhas com bcrypt.
  - Sem dados sensíveis em logs.

## Workspaces e compartilhamento

O **workspace** é a unidade de posse dos dados financeiros (multi-tenancy). Bancos, contas, cartões, categorias, transações, faturas e recorrências pertencem a um workspace — nunca diretamente a um usuário.

### Tipos

- **personal**: criado automaticamente no cadastro de todo usuário; é o workspace padrão dele. Não pode ser deletado separadamente da conta.
- **family**: workspace compartilhado criado pelo usuário para convidar cônjuge, filhos, etc.
- **business** (futuro — M5): workspace corporativo, com contas por setor e integrações para empresas. Registrado como direção do produto; será especificado no milestone.

### Papéis (roles)

Papel | Permissões
--- | ---
owner | Tudo: gerenciar membros e papéis, editar/deletar o workspace, além de tudo abaixo.
admin | Gerenciar membros (exceto owner); CRUD completo de contas, cartões, transações e categorias.
member | Criar e editar transações; visualizar tudo. (Ex.: cônjuge.)
viewer | Somente visualização. (Ex.: filhos acompanhando o orçamento.)

Regra de sucessão: o **único owner não pode sair do workspace nem ser rebaixado** — antes precisa transferir a posse (promover outro membro a owner) ou excluir o workspace. Nenhum workspace fica órfão.

### Planos e limites (fundação de monetização)

- Todo workspace tem `plan`: **free** (default) ou **premium**. Cobrança/gateway de pagamento é milestone futuro; o M1 só carrega o campo e o enforcement.
- Limites são checados na **camada de service** (um único ponto), com valores generosos por ora — ex.: free = 1 workspace compartilhado por usuário e até 5 membros por workspace; premium = sem limites. Valores são configuração, não código espalhado.

### Convites

- O owner/admin convida por e-mail ou telefone; o convite fica pendente até o convidado aceitar (no app) ou expirar.
- Se o convidado ainda não tem conta, o convite é resolvido no primeiro cadastro com aquele e-mail/telefone.

### LGPD e exclusão

- **Excluir um workspace** cascateia todos os seus dados financeiros.
- **Excluir um usuário**:
  - Workspaces em que ele é o **único owner** são excluídos com todos os dados (inclui o pessoal).
  - Em workspaces compartilhados que continuam existindo, a membership dele é removida e o `created_by` das transações dele é anonimizado (a transação permanece, pois pertence ao workspace).

## Interações entre usuários — camada social (M3)

Além do compartilhamento de workspace, usuários interagem **entre workspaces distintos**.

### Transferência entre usuários

Ex.: pix de uma conta do workspace X para o usuário dono do workspace Y.

1. O remetente registra a transferência apontando o destinatário (por telefone/e-mail de usuário da plataforma). No workspace dele, nasce imediatamente a transação de saída.
2. **Primeira interação**: o destinatário recebe uma **transferência pendente** e aceita com um toque, escolhendo em qual conta/workspace dele a entrada cai (o remetente nunca vê as contas do destinatário). Pode também recusar.
3. **Contato confiável**: ao aceitar, o destinatário pode marcar o remetente como confiável — as próximas transferências dele entram **automaticamente** na conta padrão que o destinatário definiu.
4. Segurança: destinatário não-usuário não é notificado (nada de vazamento de existência de conta); rate limit por remetente; pendências expiram (ex.: 30 dias) sem afetar o lado do remetente.

### Split de despesas

Ex.: usuário A paga a conta do restaurante e racha com 2 amigos.

1. A cria a transação da despesa cheia e abre um **split**, definindo as partes (divisão igual ou valores manuais — as partes devem somar o total).
2. Participantes podem ser **usuários da plataforma** (recebem notificação; a parte deles aparece como pendência no workspace deles) ou **externos por nome** (controle manual do A, para amigos sem o app).
3. Confirmação em dois lados quando o participante é usuário: B marca "paguei" → A confirma "recebi" → é gerada a transação de reembolso (entrada) para A, vinculada ao split. Para externos, A marca o recebimento diretamente.
4. Nos relatórios, o reembolso abate a despesa original (a despesa líquida de A no restaurante é só a parte dele).

## Previsão e IA

### Previsão mensal

Para cada mês futuro (calculada por workspace):

```
disponível projetado = saldos das contas
                     + receitas recorrentes
                     − parcelas futuras de cartão
                     − despesas recorrentes
                     − estimativa de gastos variáveis
```

### IA

- **Categorização automática** de transações (tanto no app quanto no chatbot).
- **Previsão de gastos variáveis** por categoria, com base no histórico.
- Guardrails:
  - Cache de categorizações repetidas (mesma descrição → mesma categoria, sem chamar a IA de novo).
  - Limite de tokens por requisição e orçamento por usuário.
  - Fallback determinístico (média histórica por categoria) quando a IA estiver indisponível ou o orçamento de tokens estourar.
  - Escopo restrito a finanças.

### Arquitetura do agente de IA (decisões para economia de tokens — fechadas em 2026-07-13)

Princípio: os dados são estruturados, então **não usar RAG/embeddings sobre o banco** — busca vetorial injetaria dezenas de linhas no contexto e ainda com risco de agregação errada. O banco já é o "retrieval" perfeito via SQL.

1. **Pipeline em camadas (do mais barato ao mais caro)** — cada mensagem do chatbot passa pelas camadas em ordem e para na primeira que resolver:
   - **Camada 0 — determinística (custo zero)**: parser por regex/heurística para formatos óbvios de transação ("50 mercado nubank"); cache de categorização (descrição normalizada → categoria já vista, sem chamar IA).
   - **Camada 1 — modelo pequeno (roteador)**: modelo barato (ex.: Haiku) classifica a intenção (registrar transação | pergunta analítica | fora de escopo) e faz o parsing da transação com **structured outputs** (JSON validado por schema). A maioria das mensagens morre aqui.
   - **Camada 2 — agente com tool use**: só perguntas analíticas complexas chegam a um modelo maior, que responde via tools.

2. **Tools de agregação, nunca de listagem**: as tools do agente devolvem números prontos calculados por SQL (`get_monthly_summary`, `sum_by_category`, `get_invoice_total`, `get_available_projection`), não listas de transações. O custo de tokens escala com o tamanho do resultado da tool — manter resultados na casa de dezenas de tokens.

3. **Prompt caching**: system prompt do agente (persona, guardrails, definição das tools) congelado e marcado com `cache_control` (leituras a ~10% do preço). Nada volátil no system prompt (data/hora, nome do usuário) — contexto dinâmico vai nas mensagens, para não invalidar o cache.

4. **Respostas curtas por design**: instruir o agente a responder de forma objetiva (tokens de saída são os mais caros); `max_tokens` baixo nas respostas do chatbot.

5. **Embeddings só como otimização futura e pontual**: busca semântica sobre *descrições* de transações ("aquele restaurante japonês" → "Sushi Yama") como uma tool de busca que devolve IDs para o SQL agregar — nunca como substituto do SQL.

**Impacto no M1**: mesmo sem IA, o backend já deve nascer com (a) services de agregação reutilizáveis (os mesmos que virarão tools do agente), (b) campo de descrição normalizada na `Transaction` (base do cache de categorização) e (c) a camada de service canal-agnóstica — assim o M2 pluga o agente sem refatoração.

## Decisões de arquitetura (fechadas em 2026-07-06)

### Stack

- **Backend**: TypeScript com **Bun** (runtime) + **Elysia** (framework HTTP) + **Drizzle ORM**.
  - Banco: **PostgreSQL** com Drizzle (driver `postgres.js` ou `Bun.sql`; migrações via drizzle-kit).
    Valores monetários em `bigint` de centavos (ver regras de negócio) — nunca float.
  - **Redis** para cache e **BullMQ** para filas — *entram no M2*: processamento assíncrono dos
    webhooks do WhatsApp (a Meta exige resposta rápida), categorização por IA em background e
    cache de categorização. No M1 não há job assíncrono real, então não sobe Redis (YAGNI);
    o schema e os services já nascem prontos para plugar os workers.
  - Auth: JWT de acesso (15 min) + refresh token opaco (random 256-bit, hash SHA-256 no banco,
    30 dias, rotação a cada refresh). Senhas com `Bun.password` (bcrypt, cost 12).
  - **Validação com Zod em TODA entrada** (segurança/compliance — fechado em 2026-07-14):
    (a) **body, query string e path params** de toda rota passam por schema Zod na borda —
    nenhum valor da request (nem um UUID de rota) chega ao service sem validação, eliminando
    classes de injeção e IDs malformados; (b) **envs validadas no boot** — um schema Zod por
    app/package lê `process.env`, e a aplicação não sobe com env faltando ou inválida. Regra:
    toda env nova entra no schema Zod **e** no `.env.example` no mesmo commit.
  - **Organização do backend** (fechado em 2026-07-14): cada módulo em pasta própria com
    `routes/` (**um arquivo por endpoint**) e `services/` (**um arquivo por função de negócio**),
    mais `schemas.ts` (Zod) e `errors.ts` por módulo; `index.ts` apenas compõe. Nenhum arquivo
    concentra múltiplas rotas ou services.
  - **E-mail**: **Nodemailer** via SMTP (para não acoplar a SDK de provedor), com **Resend** como
    provedor. Templates escritos com **React Email** (renderizados para HTML no envio). Trocar de
    provedor = trocar credenciais SMTP, sem mudar código.
  - Testes com `bun:test` (services com fakes; handlers com `app.handle(new Request(...))` do
    Elysia; testes de repos contra um Postgres de teste — docker compose ou Testcontainers).
- **App**: Expo (React Native + TypeScript) com dev build (`expo prebuild` — Expo Go não suporta widget).
  - Widget de tela inicial: **react-native-android-widget** (JSX → RemoteViews).
  - Navegação: expo-router. Dados: TanStack Query + fetch. Tokens: expo-secure-store.
  - Dados do widget: cache local (AsyncStorage) atualizado pelo app + `requestWidgetUpdate()`; o widget não faz fetch próprio.
- **Chatbot WhatsApp**: **Meta Cloud API (oficial)** — milestone futuro. A camada de service do backend é canal-agnóstica (`TransactionService.create(workspaceId, userId, input)`), então o webhook futuro chama o service diretamente sem mudanças estruturais.

### Estrutura do monorepo

Gerenciado com **Turborepo** (orquestração de tasks/build com cache) sobre workspaces do Bun. Tudo que for reutilizável entre apps vive em `packages/`; os apps só compõem.

```
apps/
  backend/    # Bun + Elysia — rotas, controllers, services (consome os packages)
  mobile/     # Expo (React Native)
packages/
  db/         # Drizzle: schema, client, migrações (drizzle-kit) e scripts de seed
  email/      # Nodemailer + transport SMTP (Resend) + templates React Email
  queues/     # abstração de filas + implementação BullMQ (ativada no M2, com o Redis)
  shared/     # tipos do domínio, enums, helpers de Either
turbo.json
docker-compose.yml   # infra local: Postgres (dev/testes); Redis a partir do M2
```

Convenções dos packages:

- **`db`**: **um arquivo por model** (`transaction.ts`, `card-invoice.ts`, …), cada um contendo a
  tabela Drizzle, seus enums (`pgEnum`), os tipos inferidos (`$inferSelect`/`$inferInsert`) e as
  `relations` daquele model; um `index.ts` agrega o schema completo para o client e o drizzle-kit.
- **`email`**: expõe funções de envio por caso de uso (`sendPasswordReset`, `sendEmailVerification`,
  `sendWorkspaceInvite`, …); templates React Email num diretório próprio, renderizados no envio.
  Nenhum app monta e-mail manualmente.
- **`queues`**: define a interface de enfileiramento e os tipos dos jobs desde o M1; a
  implementação BullMQ é ligada no M2 junto com o Redis (notificações, webhooks do WhatsApp,
  auto-lançamento de recorrências). No M1, tarefas assíncronas leves (ex.: envio de e-mail sem
  bloquear a request) usam despacho direto fire-and-forget — trocar para BullMQ depois é só mudar
  a implementação por trás da interface.
- **`shared`**: só o que backend **e** mobile consomem (tipos do domínio, enums espelhados,
  `Either`, **catálogo de bancos** — código/nome/cor/ícone, usado na validação do backend e na
  renderização do app); nada de dependência de servidor aqui (o mobile importa esse pacote).

## Modelos do banco de dados

Convenções gerais:

- Todo modelo de domínio financeiro tem `workspace_id` (unidade de posse dos dados e do cascade de exclusão).
- `id` é **UUIDv7** (ordenável por tempo, sem coordenação de gerador — decisão de 2026-07-13, substituindo snowflake); `created_at`/`updated_at` são data e hora em ISO 8601.

### User

Name | Type
--- | ---
id | uuid (UUIDv7)
name | text
email | text (único)
phone | text (único — vínculo com o WhatsApp)
password_hash | text (bcrypt)
email_verified_at | isoDate (nullable)
terms_accepted_at | isoDate (aceite de termos/privacidade no cadastro, com versão aceita)
platform_role | Enum (user, superadmin) — default `user`; ver "Papéis de plataforma"
failed_login_attempts | int — default 0 (lockout progressivo; ver "Rate limiting")
locked_until | isoDate (nullable — conta travada até este instante)
default_workspace_id | Workspace_Relation
created_at | isoDate
updated_at | isoDate

### RefreshToken

Name | Type
--- | ---
id | uuid (UUIDv7)
user_id | User_Relation
token_hash | text (SHA-256)
expires_at | isoDate
created_at | isoDate

### PasswordResetToken

Name | Type
--- | ---
id | uuid (UUIDv7)
user_id | User_Relation
token_hash | text (SHA-256)
expires_at | isoDate
used_at | isoDate (nullable)
created_at | isoDate

### WhatsAppLinkCode (M2)

Name | Type
--- | ---
id | uuid (UUIDv7)
user_id | User_Relation
code_hash | text
expires_at | isoDate
attempts | int
used_at | isoDate (nullable)
created_at | isoDate

### Workspace

Name | Type
--- | ---
id | uuid (UUIDv7)
name | text
type | Enum (personal, family, business)
plan | Enum (free, premium) — default `free`; ver "Planos e limites"
created_at | isoDate
updated_at | isoDate

### WorkspaceMember

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
user_id | User_Relation
role | Enum (owner, admin, member, viewer)
created_at | isoDate
updated_at | isoDate

Único por (workspace_id, user_id).

### WorkspaceInvite

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
invited_by | User_Relation
email_or_phone | text
role | Enum (admin, member, viewer)
status | Enum (pending, accepted, expired, revoked)
expires_at | isoDate
created_at | isoDate
updated_at | isoDate

### Bank

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
name | text
bank_code | text (validado contra o catálogo de bancos em `packages/shared` — sem pgEnum, para adicionar banco sem migração)
archived_at | isoDate (nullable — ver "Arquivamento e exclusão de cadastros")
created_at | isoDate
updated_at | isoDate

### BankAccount

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
bank_id | Bank_Relation
name | text
type | Enum (corrente, poupança, pagamento)
initial_balance | bigint (centavos — saldo atual é sempre derivado: initial_balance + Σ transações)
archived_at | isoDate (nullable)
created_at | isoDate
updated_at | isoDate

### Card

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
bank_id | Bank_Relation
name | text
limit | bigint (centavos)
closing_day | int (dia de fechamento da fatura)
due_day | int (dia de vencimento da fatura)
archived_at | isoDate (nullable)
created_at | isoDate
updated_at | isoDate

### Category

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
name | text
icon | text
color | text
created_at | isoDate
updated_at | isoDate

Seed com categorias padrão por workspace (mercado, transporte, moradia, lazer, saúde, salário, etc.).

### Transaction

Modelo unificado para movimentações de conta (pix/débito/dinheiro/transferência) e compras no crédito.

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
created_by | User_Relation (nullable — anonimizado se o usuário for excluído)
description | text
description_normalized | text (lowercase/sem acentos — chave do cache de categorização da IA e da busca)
amount | bigint (centavos)
type | Enum (income, expense)
method | Enum (pix, debit, cash, credit, transfer)
date | isoDate
category_id | Category_Relation
account_id | BankAccount_Relation (nullable — obrigatório quando method ≠ credit; origem na transferência)
to_account_id | BankAccount_Relation (nullable — apenas method = transfer; conta de destino)
card_id | Card_Relation (nullable — obrigatório quando method = credit)
invoice_id | CardInvoice_Relation (nullable — apenas method = credit)
installment_number | int (nullable — parcela atual)
installment_total | int (nullable — total de parcelas)
installment_group_id | uuid (nullable — agrupa as N parcelas da mesma compra)
recurring_id | RecurringTransaction_Relation (nullable)
source | Enum (app, chatbot)
deleted_at | isoDate (nullable — soft delete; cálculos filtram `deleted_at IS NULL`)
created_at | isoDate
updated_at | isoDate

Regras:

- `method = credit` → transação pertence a um `Card` e é associada à `CardInvoice` do mês de referência conforme o `closing_day` do cartão.
- Demais methods → transação pertence a uma `BankAccount` e entra no cálculo do saldo derivado da conta.
- Compra parcelada gera N transações (uma por fatura futura), com `installment_number`/`installment_total`.
- `created_by` registra quem lançou a transação (auditoria em workspaces compartilhados; no chatbot, é quem enviou a mensagem).

### CardInvoice

Fatura do cartão — agrupador mensal das transações de crédito.

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
card_id | Card_Relation
month_reference | int (1–12)
year_reference | int
status | Enum (open, closed, paid)
total | bigint (centavos)
payment_transaction_id | Transaction_Relation (nullable — transação de despesa que quitou a fatura)
created_at | isoDate
updated_at | isoDate

### RecurringTransaction

Template de transação recorrente — insumo da previsão mensal.

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
description | text
amount | bigint (centavos)
type | Enum (income, expense)
method | Enum (pix, debit, cash, credit, transfer)
category_id | Category_Relation
account_id | BankAccount_Relation (nullable)
card_id | Card_Relation (nullable)
frequency | Enum (monthly, weekly, yearly)
day_of_reference | int (dia do mês — monthly/yearly — ou da semana — weekly)
month_of_reference | int (nullable — apenas yearly: mês 1-12 em que ocorre)
active | boolean
created_at | isoDate
updated_at | isoDate

### AuditLog

Auditoria de mutações em workspaces (essencial nos compartilhados: "quem excluiu isso?").

Escopo por milestone: **M1 = write-only** — tabela + hook genérico na camada de service gravando
toda mutação; nenhum endpoint de leitura, nenhuma tela. **M2 = leitura** — endpoint + tela de
"atividade do workspace", junto com o compartilhamento. O histórico já existe desde o dia 1.

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
user_id | User_Relation (nullable — anonimizado se o usuário for excluído)
action | Enum (create, update, delete, restore)
entity | text (nome do modelo)
entity_id | uuid (UUIDv7)
created_at | isoDate

### InterUserTransfer (M3)

Name | Type
--- | ---
id | uuid (UUIDv7)
from_user_id | User_Relation
from_transaction_id | Transaction_Relation (saída no workspace do remetente)
to_user_id | User_Relation
to_transaction_id | Transaction_Relation (nullable — entrada, criada no aceite)
amount | bigint (centavos)
description | text
status | Enum (pending, accepted, rejected, expired)
expires_at | isoDate
created_at | isoDate
updated_at | isoDate

### TrustedContact (M3)

Name | Type
--- | ---
id | uuid (UUIDv7)
user_id | User_Relation (quem confia)
trusted_user_id | User_Relation (em quem confia)
default_account_id | BankAccount_Relation (onde entradas automáticas caem)
created_at | isoDate

Único por (user_id, trusted_user_id).

### ExpenseSplit (M3)

Name | Type
--- | ---
id | uuid (UUIDv7)
transaction_id | Transaction_Relation (despesa original, cheia)
created_by | User_Relation
created_at | isoDate
updated_at | isoDate

### SplitShare (M3)

Name | Type
--- | ---
id | uuid (UUIDv7)
split_id | ExpenseSplit_Relation
participant_user_id | User_Relation (nullable — participante com conta)
participant_name | text (nullable — participante externo, sem app)
amount | bigint (centavos — as partes somam o total da transação)
status | Enum (pending, paid, confirmed)
reimbursement_transaction_id | Transaction_Relation (nullable — entrada gerada na confirmação)
created_at | isoDate
updated_at | isoDate

### WhatsAppLink (M2)

Vínculo de conversas/grupos do WhatsApp com workspaces.

Name | Type
--- | ---
id | uuid (UUIDv7)
workspace_id | Workspace_Relation
wa_chat_id | text (id do grupo ou conversa na Meta Cloud API)
linked_by | User_Relation
created_at | isoDate
updated_at | isoDate

## Segurança: fluxos de autenticação (fechados em 2026-07-13)

### Cadastro

- Cadastro exige **aceite dos termos de uso e política de privacidade** (registrado em `terms_accepted_at`, com a versão aceita).
- Após o cadastro, é enviado **e-mail de verificação** (link com token — mesmo mecanismo do reset: random 256-bit, hash no banco, single-use, TTL 24h). O usuário pode usar o app sem verificar, mas **recuperação de senha e convites de workspace exigem e-mail verificado** — evita que um typo de e-mail (ou o e-mail de terceiro) receba links sensíveis.
- **Exclusão de conta** disponível ao próprio usuário nas configurações (LGPD), com confirmação forte (redigitar a senha); executa o cascade definido em "Workspaces e compartilhamento".

### Recuperação de senha (M1 — por e-mail; futuramente também via WhatsApp)

Fluxo: usuário pede recuperação → recebe **link por e-mail** → abre página de redefinição → digita a nova senha → é redirecionado ao login. Controles (OWASP Forgot Password / Authentication Cheat Sheets):

- `POST /auth/forgot-password` responde **sempre a mesma mensagem genérica** (não revela se o e-mail existe) e com tempo de resposta constante.
- Token de reset: **random 256-bit**, armazenado como **hash SHA-256**, **single-use**, TTL de **30 minutos**; gerar um novo invalida os anteriores do usuário.
- O link aponta para página de redefinição (web) que valida o token só no submit; a nova senha segue a política de senha (mínimo 8 caracteres; recomendação de checagem contra senhas vazadas — ex.: API do Have I Been Pwned — como melhoria).
- Ao redefinir: **revogar todos os refresh tokens** do usuário (derruba sessões) e enviar e-mail de notificação "sua senha foi alterada".
- **Rate limiting** nos endpoints de forgot/reset (por IP e por conta).
- Envio via **Nodemailer + Resend (SMTP)** com templates em **React Email** (ver Stack).
- Recuperação via WhatsApp: escopo futuro (pós-M2), reutilizando o vínculo verificado.

### Vínculo do WhatsApp por OTP (M2)

Princípio: o vínculo **nasce no app autenticado**, nunca só pela conversa — impede que alguém cadastre o telefone de outra pessoa e receba os dados dela.

1. No app (logado), o usuário inicia "Vincular WhatsApp"; o backend gera um **código OTP de 6 dígitos** (random criptográfico, hash no banco, TTL de **5 minutos**, single-use) e o exibe no app.
2. O usuário envia esse código para o bot **a partir do próprio WhatsApp**; o número remetente da mensagem é o que será vinculado.
3. O backend valida hash + expiração; máximo de **3 tentativas por código** e rate limit por telefone e por conta — depois disso o código é invalidado e é preciso gerar outro.
4. Vínculo criado → notificação no app e mensagem de confirmação no WhatsApp. O usuário pode **revogar o vínculo** a qualquer momento nas configurações.
5. **Grupos**: vincular um grupo a um workspace exige comando vindo de um membro já vinculado com papel `owner`/`admin` naquele workspace.
6. Mensagens de número não vinculado recebem apenas a instrução de vínculo — nunca dados financeiros.

### Rate limiting e proteção contra abuso (plano fechado em 2026-07-14)

Três camadas complementares:

1. **Por IP** (anti força bruta simples): limites por rota — login 10/min, registro 5/h,
   forgot/reset 5/h, refresh 30/min. M1 em memória (instância única); M2 migra para Redis
   (janela deslizante) atrás da mesma interface. O IP de `X-Forwarded-For` só é confiado com
   `TRUST_PROXY=true` (atrás do proxy do provedor); caso contrário usa o IP do socket —
   evita spoof da chave de limite.
2. **Por identidade-alvo** (anti credential stuffing distribuído):
   - **Login com lockout progressivo persistido no banco** (`failed_login_attempts` +
     `locked_until` no User): a cada 5 falhas consecutivas, trava por 1 → 5 → 15 → 60 min.
     Zerado em login com sucesso ou reset de senha. A resposta durante o lockout é o mesmo
     `invalid_credentials` genérico (sem `Retry-After`) — qualquer diferenciação viraria
     oráculo de existência de conta.
   - **Forgot password**: máx. 3/h por e-mail alvo, além do limite por IP (anti flood de
     e-mail na vítima).
   - Lockout dispara **e-mail de atividade suspeita** ao dono da conta.
3. **Por usuário autenticado** (anti abuso/scraping): limite geral nas rotas de domínio
   (300 req/min por usuário). No M2 somam-se os limites de OTP (3 tentativas/código +
   cooldown por conta e por telefone) e o orçamento do chatbot já especificados.

Transversal: respostas de limite são **429 + `Retry-After`** (exceto o lockout de login,
acima); todo evento de limite/lockout gera **log estruturado** sem dados sensíveis —
é o sinal de ataque em andamento.

## Operação e requisitos não-funcionais

- **Deploy**: backend + Postgres em provedor gerenciado (a definir na implementação: Railway/Fly.io/VPS + Docker); Postgres gerenciado com backup automático (ou `pg_dump` diário se self-hosted).
- **Ambientes**: dev e prod; variáveis via `.env` (nunca commitadas, com `.env.example` versionado).
- **Infra local via docker compose** (`docker-compose.yml` na raiz): sobe o Postgres de dev com um
  comando (`docker compose up -d`); o Redis entra no mesmo compose quando chegar o M2. O mesmo
  compose serve de banco para os testes de repositório.
- **Seed do banco** (`bun run db:seed`): script idempotente que popula o ambiente de dev com dados
  realistas — usuário demo, workspace pessoal, bancos/contas/cartões, categorias padrão e algumas
  dezenas de transações (incluindo parceladas, recorrentes e faturas em vários status) para
  desenvolver as telas sem depender de cadastro manual. Separado do **seed de produção**, que se
  limita às categorias padrão criadas junto com cada workspace.
- **Observabilidade mínima**: logs estruturados (JSON) sem dados sensíveis (sem senhas, tokens, valores com identificação); request-id por requisição.
- **Rate limiting global** no auth (login, refresh, forgot-password) contra força bruta.
- **CI**: rodar `bun test` + typecheck em todo push (GitHub Actions).

## Escopo negativo (explicitamente fora, por ora)

- iOS (o widget do M1 é Android; iOS entra em milestone futuro).
- Multi-moeda (BRL apenas).
- Metas/orçamento por categoria (backlog pós-M3).
- Pagamento parcial de fatura (backlog).
- Open Finance / importação bancária automática (avaliado em 2026-07-13; custo de agregador não justifica agora).
- Auto-lançamento de recorrências no M1 (entra no M2 com BullMQ).
- **Suporte offline**: o M1 é online-only (cache de leitura via TanStack Query, mas escrita exige conexão); offline-first com sync é backlog — é um projeto próprio (fila local, resolução de conflitos).
- **2FA (TOTP)**: backlog pós-M2.
- **Lista de sessões/dispositivos com revogação individual**: backlog (o reset de senha já revoga tudo).
- **OTA updates do app (expo-updates)**: backlog.
- **Cobrança/gateway de pagamento dos planos**: milestone futuro (o M1 só carrega `plan` + limites).

## Regras de negócio financeiras (fechadas em 2026-07-13)

### Dinheiro
- Todos os valores monetários em **centavos, como `bigint`** — nunca float/decimal em código.
- Moeda única **BRL** no M1 (sem campo `currency`; multi-moeda é escopo negativo por ora).
- Formatação (R$ x,xx) é responsabilidade exclusiva dos clients.

### Saldo de conta
- O saldo atual de uma `BankAccount` é **sempre derivado**: `initial_balance + Σ transações da conta` (receitas somam, despesas subtraem; transferências subtraem da origem e somam no destino).
- Nenhum saldo corrente é gravado — editar ou excluir transação nunca desincroniza nada.

### Fatura de cartão (ciclo de vida)
- **Criação lazy**: a fatura de um mês de referência é criada quando a primeira transação de crédito daquele mês é lançada.
- **Competência**: compra com data ≤ `closing_day` do cartão cai na fatura do mês corrente; após o `closing_day`, na fatura do mês seguinte.
- **Fechamento**: o status efetivo é **calculado na leitura** (M1, sem jobs): fatura `open` cuja data já passou do `closing_day` é tratada como `closed` em qualquer consulta, e a transição é persistida oportunisticamente no primeiro toque. No M2, um job (BullMQ) assume o fechamento pontual e dispara o push de "fatura fechou". Compra lançada retroativamente em fatura `closed` (não paga) é permitida e recalcula o total.
- **Pagamento**: "pagar fatura" cria uma **transação de despesa na conta bancária escolhida** (method pix/debit), vincula-a via `payment_transaction_id` e marca a fatura como `paid`. Pagamento parcial fica fora do M1 (backlog).
- `CardInvoice.total` é derivado da soma das transações de crédito da fatura (mesmo princípio do saldo).
- **Limite disponível** do cartão = `limit − Σ(totais de faturas não pagas)` — exibido na tela do cartão.

### Parcelamento
- Compra em N parcelas gera **N transações**, uma por fatura futura consecutiva, com `installment_number`/`installment_total`.
- Divisão em centavos: valor inteiro dividido por N; o resto do arredondamento vai na **primeira parcela** (as N parcelas somam exatamente o total).
- Excluir uma compra parcelada exclui todas as parcelas não pagas (parcelas em fatura `paid` seguem a regra de imutabilidade abaixo).

### Transferência entre contas
- **Transação única**: `method: transfer`, `account_id` (origem) + `to_account_id` (destino).
- Não conta como receita nem despesa na visão mensal e nos relatórios — é movimentação neutra.

### Arquivamento e exclusão de cadastros
- **Conta, cartão e banco com transações não são deletáveis — são arquiváveis** (`archived_at`): somem dos formulários de lançamento, mas continuam visíveis no histórico e entram nos cálculos. Sem transações, podem ser excluídos de verdade.
- **Categoria em uso**: ao excluir, as transações são reatribuídas para **"Outros"** — categoria padrão do seed, não-deletável.

### Edição e exclusão
- Transações são livremente editáveis e excluíveis, **exceto** as vinculadas a fatura `paid` — essas são imutáveis; correção se faz por **estorno** (transação inversa na fatura corrente).
- Exclusão é **soft delete** (`deleted_at`): permite desfazer e protege contra exclusão acidental em workspace compartilhado. Purge definitivo apenas no cascade da LGPD.
- Toda mutação (create/update/delete/restore) gera entrada no `AuditLog` do workspace.
- Como saldo e total de fatura são derivados, mutações não exigem recálculo compensatório.

### Recorrências
- `RecurringTransaction` **não gera transação automaticamente** no M1: aparece como *prevista* na visão mensal (alimenta a projeção de disponível) e, chegado o `day_of_reference`, o app oferece **confirmar o lançamento com um toque**.
- Auto-lançamento via job (BullMQ) é melhoria do M2, junto com o Redis.

### Timezone e competência
- Toda lógica de competência (data da transação, `closing_day`, mês de referência) usa **`America/Sao_Paulo`** fixa no M1.
- `created_at`/`updated_at` permanecem em UTC (ISO 8601); a data de competência da transação é uma **date local**, sem hora.

## Milestones

1. **M1 (atual)**: backend (auth com recuperação de senha + workspaces com fundação de multi-tenancy: workspace pessoal auto-criado no cadastro, `workspace_id` em todo o schema + CRUD de bancos, contas, cartões, categorias e transações + geração de faturas + soft delete + AuditLog write-only) e app (telas + busca/filtros + onboarding com seed + widget de resumo financeiro). Previsão determinística básica (recorrências + parcelas futuras). *Sem UI de compartilhamento ainda — mas o schema já nasce pronto para isso.*
2. **M2**: compartilhamento (convites, papéis, seletor de workspace no app, tela de atividade lendo o AuditLog) + chatbot WhatsApp via Meta Cloud API (vínculo por OTP, grupos a workspaces), com IA de interpretação/categorização e guardrails de custo; IA de previsão de gastos variáveis; Redis + BullMQ (webhooks assíncronos, auto-lançamento de recorrências). Também: notificações push (fatura fechou/vence, recorrência a confirmar), export CSV (portabilidade LGPD) e biometria para abrir o app.
3. **M3**: camada social — transferências entre usuários (aceite + contato confiável) e split de despesas; anexo de comprovante nas transações (storage S3/R2, incluindo foto via chatbot).
4. **M4**: dashboard web, incluindo o modo superadmin (configurações da plataforma, gestão de usuários, feature flags, métricas). O campo `platform_role` já existe no schema desde o M1.
5. **M5**: workspaces corporativos (business) — contas por setor, integrações para empresas.

## Requisitos de implementação

- Toda nova implementação deve incluir testes unitários ou end-to-end para garantir a qualidade do código.
- Deve seguir as boas práticas de desenvolvimento e padrões de código.
- Deve usar os conceitos de KISS, YAGNI e do menor custo possível.
- Usar clean code, com inspiração em conceitos de clean architecture (repositories, services, controllers, use cases).
