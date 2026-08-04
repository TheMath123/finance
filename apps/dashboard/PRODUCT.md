# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Este dashboard atende dois públicos distintos, ambos autenticados:

1. **Usuários do ecossistema financeiro** (pessoas físicas e workspaces
   compartilhados — família hoje, empresa no roadmap) que preferem o
   navegador ao app mobile. É uma alternativa de **paridade real** com o
   app (não uma versão reduzida): CRUD de bancos/contas/cartões/
   transações, faturas, visão mensal projetada, gestão de membros/
   convites do workspace e autoatendimento de assinatura (Stripe).
2. **Superadmins da plataforma** — operadores que gerenciam a plataforma
   como um todo (usuários, categorias padrão do seed, guardrails de IA,
   feature flags, métricas de uso, planos/preços). Este papel **nunca**
   tem acesso aos dados financeiros de nenhum workspace — atua numa área
   administrativa isolada, com auditoria própria (exigência de LGPD).

## Product Purpose

O produto organiza finanças pessoais e compartilhadas — bancos, contas,
cartões, transações, faturas, recorrências e projeção de disponível —
através de três superfícies (app mobile, chatbot no WhatsApp e este
dashboard web) sobre um único backend canal-agnóstico.

Existe pra reduzir o atrito de registrar o dia a dia financeiro (lançar
transação por linguagem natural no WhatsApp, com categorização por IA) e
dar a famílias/pequenos grupos visibilidade e controle compartilhado
sobre o dinheiro, com papéis (owner/admin/member/viewer) por workspace.

Sucesso: virar um **SaaS real com workspaces pagantes** — já existe
integração Stripe (Checkout + Customer Portal), planos com preços/
limites/trial configuráveis e autoatendimento de troca de plano. Não é
mais só ferramenta de uso pessoal; toda decisão de produto daqui pra
frente deve fazer sentido para sustentar clientes pagantes de verdade.

## Positioning

O mecanismo que um concorrente não copiaria casualmente é a combinação
de duas coisas:

- **Captura de transação nativa no WhatsApp** por linguagem natural,
  processada por um pipeline de IA em camadas (parser determinístico →
  classificador barato com structured output → agente com tool use só
  para perguntas analíticas complexas) — desenhado desde o início pra
  manter custo de token baixo em escala.
- **Um único backend canal-agnóstico** servindo app, dashboard web e
  chatbot de forma idêntica — toda feature (split de despesa,
  transferência entre usuários, projeção de disponível, assinatura) fica
  disponível em qualquer superfície que o usuário preferir, incluindo um
  dashboard web com paridade completa para quem não quer instalar app.

## Operating Context

Workspaces (pessoal/família/business futuro) compartilhados entre
pessoas com papéis distintos; transações lançadas pelo app, pelo
dashboard ou pelo chatbot do WhatsApp; faturas de cartão fechando/
vencendo em ciclo mensal; recorrências que pedem confirmação com um
toque; ciclo de vida de assinatura gerenciado via Stripe Checkout/
Customer Portal hospedados (sem UI de pagamento própria); superadmins
operando uma área administrativa separada, sem tocar em dado financeiro
de workspace nenhum.

## Capabilities and Constraints

- **BRL apenas** — sem multi-moeda.
- Todo valor monetário é inteiro em centavos — nunca float.
- Regras de LGPD: soft delete, export CSV, exclusão de conta/workspace
  em cascata conforme papel (owner único vs. membro).
- Superadmin tem **zero acesso** a dado financeiro de workspace — só
  administra a plataforma, com auditoria própria separada.
- Limites de plano/feature são aplicados centralmente e refletem o
  `subscriptionStatus` real do Stripe (trial baseado em tempo E
  cancelamento real coexistem sem se atropelar).
- **Toda chamada ao backend acontece só no lado servidor** do SvelteKit
  (`load`/`actions`/`+server.ts`) — o browser nunca guarda token de
  sessão nem chama a API diretamente.
- Dashboard precisa funcionar bem em tela de celular — é alternativa
  real ao app, não uma ferramenta só de desktop/admin.

## Brand Commitments

Nome final ainda não confirmado — **"Marcelus" é apelido/codinome de
projeto** (decisão de 2026-08-01), usado nos títulos de página, sidebar e
como logo provisória (`static/logo.svg`). `@finance/*` (namespace interno
dos pacotes do monorepo) continua como está, sem relação com o branding —
renomear isso não traz ganho nenhum pro usuário final e tem alto risco
(centenas de imports). Os logos de banco exibidos por transação são de
instituições financeiras terceiras, não da marca do produto.

## Evidence on Hand

Nenhuma — produto ainda não lançado, sem clientes reais, testemunhos,
casos de uso publicados ou imprensa. Os dados usados em desenvolvimento
vêm de seed (`bun run db:seed`: usuário demo, workspace, transações
fictícias) — trabalho futuro não deve fabricar evidência real a partir
disso.

## Product Principles

1. Toda lógica de negócio (limites de plano, categorização, projeção)
   mora numa camada de service canal-agnóstica — nenhuma feature nova
   pode depender de um client específico.
2. Reduzir o atrito do registro do dia a dia (linguagem natural no
   WhatsApp) é tão central quanto o CRUD tradicional — IA nunca é
   feature de vitrine, é parte do fluxo principal.
3. Isolamento rígido entre operação de plataforma (superadmin) e dados
   financeiros dos usuários — nunca compartilhar autoridade entre os
   dois papéis.
4. Dashboard web tem paridade real com o app — precisa funcionar bem em
   qualquer tela, não é uma versão reduzida ou só-admin.
5. Rumo a SaaS real: toda decisão de limite/plano/cobrança precisa fazer
   sentido pra sustentar clientes pagantes, não só uso pessoal.

## Accessibility & Inclusion

Padrão mínimo confirmado: **WCAG AA**.
