## Finance Eco System

### Objetivos
Uma aplicação completa um ecosistema, que vai des de uma app mobile, até um dashboard web, até um integração com whatsapp como chatbot, até mesmo um backend para orquestrar os clients.
Construir uma aplicação de organização de finanças, que basicamente vai receber uma transação pelo bot do whatsapp, que pode está em conversa privada ou em um grupo, e vai salvar a transação no app. Basicamente esse chatbot na primeira integração com o número de telefone do usua´rio, vai fazer o link com conta dele do aplicativo(plataforma).

### Funcionalidades
#### Comum
- Deve conter um sistema de autenticação para o usuário.
- O usuário pode ter um grupo de anotações e lembretes.
- O formatado que será suporteador é markdown, mais a visualização será o texto estilizado.
- Todos deve usar sistema de tratamento de erro, eficiente e consistente.
  - Deve utilizar o either.


#### APP
- O app terá um widget que mostra as anotações e lembretes, que pode ser adicionado na tela inicial ou no menu de opções.
- O app terá uma tela de anotações e lembretes. E podem ser adicionados, editados e removidos por meio dessa tela.
- Esse widget pode ser arrastado para a tela inicial ou adicionado no menu de opções.
- Todas as requisicoes devem ser separados em services e organizadas

#### Chatbot
- O chatbot pode ser adicionado no grupo e linkado a conta de acesso ao app.
- O chatbot pode ser usado para criar anotações e lembretes, e esses dados serão salvos no app.
- Talvez ter uma IA para fazer a filtragem de anotações e lembretes.
  - Deve conter varios guardrails para economizar tonkens e não gastar muito.
  - Alem de não responder perguntas que não estão relacionadas a anotações e lembretes, deve ser capaz de responder de forma amigável e útil.
  - Deve ser capaz de aprender e adaptar-se a novas perguntas e contextos.

#### Backend
- Deve ser capaz de processar e responder as perguntas do chatbot.
- Deve ser capaz de salvar e recuperar as anotações e lembretes do usuário.
- Deve usar um banco de dados para armazenar as anotações e lembretes do usuário.
- Conter todas as complices de segurança e autenticação necessárias.
- Deve respeitar a LGPD e proteger os dados do usuário.


### Decisões de arquitetura (fechadas em 2026-07-06)

#### Stack
- **Backend**: TypeScript com **Bun** (runtime) + **Elysia** (framework HTTP) + **Drizzle ORM**.
  - Banco: **SQLite** via `bun:sqlite` (driver nativo do Bun) com Drizzle (migrações via drizzle-kit).
  - Auth: JWT de acesso (15 min) + refresh token opaco (random 256-bit, hash SHA-256 no banco,
    30 dias, rotação a cada refresh). Senhas com `Bun.password` (bcrypt, cost 12).
  - Testes com `bun:test` (services com fakes; handlers com `app.handle(new Request(...))` do
    Elysia; smoke de repos com SQLite `:memory:`).
- **App**: Expo (React Native + TypeScript) com dev build (`expo prebuild` — Expo Go não suporta widget).
  - Widget de tela inicial: **react-native-android-widget** (JSX → RemoteViews).
  - Navegação: expo-router. Dados: TanStack Query + fetch. Tokens: expo-secure-store. Markdown: react-native-markdown-display (edição em TextInput com toggle de preview).
  - Dados do widget: cache local (AsyncStorage) atualizado pelo app + `requestWidgetUpdate()`; o widget não faz fetch próprio.
- **Chatbot WhatsApp**: **Meta Cloud API (oficial)** — milestone futuro. A camada de service do backend é canal-agnóstica (`NoteService.CreateNote(userID, input)`), então o webhook futuro chama o service diretamente sem mudanças estruturais.

## Modelos do banco de dados
- LGPD-base: exclusão de usuário cascateia todos os dados; senhas com bcrypt; sem dados sensíveis em logs.

#### Bank
Name | Type
---
id | snowflake
name | text
bank | Enum(Bancos brasileiros e internationais)
created_at | date and hour - isoDate
updated_at | date and hour - isoDate

#### Card
Name | Type
---
id | snowflake
name | text
bank | Bank_Relation
created_at | date and hour - isoDate
updated_at | date and hour - isoDate

#### Card trasactions
Name | Type
---
id | snowflake
description | text
card | Card_Relation
value | decimal
created_at | date and hour - isoDate
updated_at | date and hour - isoDate

#### Bank Accounts
Name | Type
---
id | snowflake
description | text
bank | Bank_Relation
value | decimal
created_at | date and hour - isoDate
updated_at | date and hour - isoDate

#### Trasactions
Name | Type
---
id | snowflake
mouth_reference | Mounth
year_reference | Year
created_at | date and hour - isoDate
updated_at | date and hour - isoDate


#### Milestones
1. **M1 (atual)**: backend (auth + CRUD de notes/groups) + app (telas + widget).
2. **M2**: chatbot WhatsApp via Meta Cloud API, com IA de filtragem e guardrails de custo.

### Requisitos de implementação
  - Todas novas implementações deve implementar teste unitarios ou end-to-end para garantir a qualidade do código.
  - Deve seguir as boas práticas de desenvolvimento e padrões de código.
  - Deve usar os conceitos de kiss, yagni e do menor custo possível.
  - Usar o clean code, e inspirações em alguns conceitos de clean arch(repositóries, services, controllers, use cases).
