# DESIGN.md — site institucional (apps/landing)

**Modo:** Persuade. **Direção:** Editorial de luxo / ângulos retos — pedido explícito do
usuário: "mais moderno e luxuoso... tirar um pouco o border radius, deixando estilo
mais com ângulos retos". Brief-pinned, sem ceremônia de concept-seed (pedido preciso,
não exploratório).

## THESIS

O site institucional deixa de parecer "SaaS genérico" (cantos arredondados, cards
uniformes ícone+título+texto) e passa a se ler como material de banco
privado/gestão de patrimônio: ângulos retos, hairlines finas, tipografia serifada
de alto contraste, papel/tinta quente em vez de branco-azulado neutro.

## OWN-WORLD

- **Paleta:** preto-e-branco neutro de verdade (0% de saturação em fundo,
  texto, bordas, superfícies de hover) — a versão anterior usava marfim/papel
  quente (`hsl(42 26% 96%)`) e carvão/espresso quente (`hsl(30 12% 7%)`), que
  na prática liam como marrom/amarelo; revisado a pedido do usuário pra
  cinza puro. Duas cores de marca, com hex pinado explicitamente pelo
  usuário: **`--primary` `#2DC8BB`** (teal vívido, reservado só pra ação —
  CTA, foco, link primário) e **`--brand-dark` `#114A45`** (mesma família de
  matiz do primary, ~175°, só mais escura — reservada só pra elementos
  informativos/decorativos: ícone de feature, badge de trial). Por serem
  tom-sobre-tom do mesmo matiz (não um matiz concorrente), `--brand-dark`
  funciona como "tinta de marca" sem nunca aparecer ao lado do botão de ação
  — evita o conflito que o primeiro acento (`--brass`, dourado/latão)
  causava por competir visualmente com o primary.
- **Radius:** `--radius: 0px` — zerado de propósito, só nesse app (o dashboard
  mantém radius arredondado, não é tocado). Ângulos retos em botões, cards de
  plano, painel de cookies, tudo.
- **Bordas:** hairline 1px (`border-border`) no lugar de sombra — divisórias de
  seção, grade de preços (`gap-px bg-border` + células `bg-background`), nunca
  `box-shadow` decorativo.
- **Tipografia:** `Bodoni Moda Variable` (serifada de alto contraste, editorial/
  luxo — Didone, a mesma família de registro visual de moda/joalheria) pros
  headlines e nomes de plano; `Inter Variable` (já usada) pro corpo/UI. Rótulos
  de navegação e botões em versalete tracked (`uppercase tracking-wide`), nunca
  caixa mista informal.
- **Botões:** retângulos sharp — preenchido (`bg-foreground`/`bg-primary`) ou
  contornado (`border-foreground/30`), texto em versalete tracked. Sem pill,
  sem badge arredondado.

## STORY

Visitante entende em segundos: isto organiza as finanças pessoais dele, com o
mesmo rigor visual de um produto financeiro sério — não é "mais um app
colorido". A seção de recursos vira uma lista editorial (ícone inline + título
serifado + descrição, dividida por hairline), não uma grade de cards
ícone-em-caixa-arredondada — esse padrão foi deliberadamente recusado (ver
craft-floor: "same-size cards of icon+heading+text" é um refuso, não um
default).

## FIRST VIEWPORT

Header com wordmark serifado + nav em versalete + CTA sharp contornado. Hero:
h1 serifado grande (`text-7xl` no desktop), realce em itálico na cor de marca,
dois CTAs sharp lado a lado. Sem hero-metric, sem eyebrow/kicker acima do
título (banido).

## FORM

Refinamento de brief pinado — sem tournament de 7 candidatos nem
`concept-seed.mjs` (pedido já veio com direção concreta: luxo + ângulos retos).
Aplicado direto no CSS/tokens (`layout.css`) e nas 4 páginas + banner de
cookies.

## Páginas afetadas

- `src/routes/layout.css` — tokens (paleta, radius, fonte de exibição).
- `src/routes/[lang=lang]/+layout.svelte` — header/footer.
- `src/routes/[lang=lang]/+page.svelte` — hero + lista editorial de recursos +
  faixa final full-bleed.
- `src/routes/[lang=lang]/pricing/+page.svelte` — grade de planos com hairlines
  (`gap-px bg-border`), sem pills.
- `src/routes/[lang=lang]/privacy/+page.svelte` e `terms/+page.svelte` —
  tipografia só (sem cards).
- `src/lib/components/cookie-consent-banner.svelte` — botões sharp, sem sombra.

## Verificação feita

- `bun --cwd=apps/landing run lint` — limpo.
- `bunx turbo run typecheck --filter=@finance/landing --force` — 0 erros.
- `node .claude/skills/impeccable/scripts/detect.mjs --json <arquivos>` — 0
  achados.
- Build de produção **não confirmado nesta rodada** — bloqueado pelo mesmo
  lock de dev server local já documentado em `tasks/in-progress/
ci-cd-deploy.md` (não é regressão desta mudança).

## FINISH (honesto, não silencioso)

Este ambiente não tem ferramenta de screenshot/browser automation disponível —
a revisão de acabamento (`impeccable-finish-reviewer`) que normalmente compara
capturas de tela desktop/mobile **não pôde rodar**. Substituída por: leitura
manual completa do código de cada página alterada + detector mecânico (0
achados) + lint/typecheck limpos. Recomendo abrir `bun run dev` localmente e
olhar as 5 páginas (home/pricing/privacy/terms + banner de cookies) em
desktop e mobile antes de publicar — isso não foi verificado visualmente por
mim.

## Atualização — seletor de intervalo de cobrança + preço mensal em destaque (pricing)

Refinamento pontual de `[lang=lang]/pricing/+page.svelte` (não é um novo
concept-seed — extensão dentro do mundo visual já commitado acima).

- **Problema resolvido:** cada plano só mostrava o preço do seu intervalo
  `isDefault` (ex.: Pro só em "a cada 12 meses"); quem quisesse comparar
  mensal/semestral/anual não tinha como, e o valor grande do card nem sempre
  era o mais fácil de comparar entre planos (um anual e um mensal lado a
  lado não são comparáveis à primeira vista).
- **Decisão de forma:** seletor segmentado (Mensal/Semestral/Anual) acima da
  grade, sharp (sem pill — `border-border`, sem radius, versalete tracked,
  mesmo vocabulário do resto do site) em vez de empilhar 3 preços por card
  (poluiria a leitura da lista de features, que já é densa). Opções e rótulos
  derivados dos dados reais (`billingIntervalUnit`/`Count` de cada plano),
  nunca hardcoded — some sozinho se só existir 1 intervalo em todos os
  planos.
  - Cada card sempre mostra o **equivalente mensal** em destaque (`text-3xl`),
    mesmo quando o intervalo escolhido é semestral/anual — é o número que
    permite comparar planos e intervalos de cara.
  - Linha secundária menor mostra a cobrança real ("R$ X a cada N meses") e,
    quando o plano tem um preço mensal cadastrado como referência, o
    percentual de economia (`economize X%`), calculado — nunca fabricado
    sem uma base de comparação real.
  - Selo de economia máxima repetido no próprio botão do seletor (ex.:
    "Anual -25%") — reforça a atratividade da opção mais longa sem precisar
    abrir os cards pra descobrir.
  - Um "authored moment" de motion: crossfade de 150ms (`svelte/transition`
    `fade`, escopo local por `{#key price.id}`) na troca do valor — não em
    cada elemento da página, só nesse ponto de leitura que muda de fato.
- **Responsivo:** botões do seletor em `flex-1` (ocupam a largura toda,
  divididos igualmente) até `sm:`, onde viram `flex-none` compactos e
  centralizados — não depende de media query separada pra decidir "quantas
  colunas", só troca o comportamento do flex.
- **Contraste verificado nos tokens reais** (não assumido): o selo de
  economia usa `text-brand-dark` nos estados normais do seletor (calculado:
  ~10:1 contra fundo claro do modo light, ~8.85:1 contra o fundo quase-preto
  do modo dark — os dois modos já tinham essa variável tunada
  separadamente em `layout.css`). No botão **ativo** do seletor, que inverte
  localmente pra `bg-foreground`/`text-background`, `text-brand-dark` ficaria
  ilegível nos dois modos (a variável só é tunada pros 2 fundos globais, não
  pra essa superfície local invertida) — corrigido usando `text-background/70`
  nesse estado específico, garantindo o mesmo par de cor do próprio rótulo do
  botão.

### Verificação feita (desta rodada)

- `bun --cwd=apps/landing run lint` (Prettier + ESLint) — limpo.
- `bunx turbo run typecheck --filter=@finance/landing --force` — 0 erros.
- `node .claude/skills/impeccable/scripts/detect.mjs --json <arquivos>` — 0
  achados.
- Contraste do selo de economia calculado manualmente contra os valores reais
  de `--brand-dark`/`--background`/`--foreground` nos dois modos (ver acima)
  — não é suposição, é cálculo em cima do HSL real do `layout.css`.
- **Build de produção (`bunx turbo run build --filter=@finance/landing`)**:
  a compilação SvelteKit em si completa ("✓ built in 5.70s"), mas o adapter
  Cloudflare falha no cleanup (`EPERM`/"Device or resource busy" ao remover
  `.svelte-kit/cloudflare`) — mesmo lock de dev server local já documentado
  em `tasks/in-progress/ci-cd-deploy.md`, não é regressão desta mudança.
- **Não verificado visualmente** (mesma limitação do FINISH acima, sem
  ferramenta de browser neste ambiente): recomendo `bun run dev` local e
  olhar `/pt/pricing` em desktop e mobile, alternando os 3 botões do
  seletor, antes de publicar.

## Atualização — reescrita de conteúdo da home + hero split-screen + Enterprise

Implementação de `tasks/in-progress/especificacao_landing_page_marcelus.md`
(documento de copywriting/conteúdo entregue pelo usuário). Escopo: home
inteira, nav/footer do layout, e um card novo na grade de preços — ainda
dentro do mesmo mundo visual (editorial de luxo, ângulos retos); não é
redesign.

- **Hero reestruturado** (`[lang=lang]/+page.svelte`): H1 agora carrega
  "Conheça o _Marcelus_" + uma 3ª linha com o propósito do produto
  explícito ("O seu app de organização financeira pessoal e
  compartilhada.") — os 2 requisitos de compliance do OAuth do Google
  (nome explícito + propósito claro no primeiro texto lido) resolvidos
  dentro do próprio H1, não como texto solto. CTA primário ganhou
  subtítulo pequeno ("Não exige cartão de crédito. Cancele quando quiser.").
- **Mockup split-screen novo** (`lib/components/hero-device-mockup.svelte`):
  celular com uma conversa de WhatsApp simulada (mensagem do usuário + bolha
  de confirmação da IA) sobreposto a um "notebook" com um resumo do
  dashboard (saldo + 3 linhas de transação) — tudo em HTML/CSS puro, sem
  imagem/screenshot real (nenhuma ferramenta de captura disponível neste
  ambiente), respeitando o vocabulário do site: ângulos retos, hairline,
  sombra com offset+blur real (não halo decorativo), tokens de cor
  existentes. `aria-hidden="true"` (decorativo, conteúdo já coberto pelo
  texto real da página).
- **Seção "dor do usuário"** — nova, copy exata da especificação, tratamento
  editorial (título serifado grande + parágrafo, sem card). A seção
  "Segurança e Transparência" da especificação foi implementada e depois
  **removida a pedido do usuário** (2026-08-16, mesma sessão) — julgada
  redundante; conteúdo de segurança/LGPD já coberto em `/privacy` e
  `/terms`. `home.securityTitle`/`securityText` removidos do i18n.
- **Funcionalidades reduzidas de 6 para 3** (IA no WhatsApp / Finanças
  Compartilhadas / Fórmulas e Personalização), cada uma com uma tagline em
  itálico na cor `--primary` além da descrição — decisão deliberada da
  especificação (menos itens, mais afiados), não uma omissão. A entrada
  "Finanças Compartilhadas" ganhou `id="familias"`, alvo do link "Para
  Famílias" do menu; a seção toda ganhou `id="funcionalidades"`.
- **Header**: novos links-âncora "Funcionalidades"/"Para Famílias" (`hidden
sm:inline` — na tela pequena o essencial, Preços/Entrar, já ocupa o
  espaço disponível, e o conteúdo continua alcançável rolando a home).
  "Blog" citado na especificação foi **omitido** por decisão (sem CMS/blog
  no projeto — evita link morto; usuário não respondeu a tempo à pergunta
  de esclarecimento, decisão tomada e sinalizada na resposta).
- **Footer**: link "Contato e Suporte" novo, `mailto:suporte@marcelus.app`
  — **e-mail é um placeholder plausível, não confirmado pelo usuário**
  (mesma pergunta sem resposta a tempo); copyright mudou de "Marcelus" pra
  "Marcelus App" (texto exato da especificação), ano continua dinâmico
  (`new Date().getFullYear()`, não hardcoded — a especificação pede
  "2026" mas fixar o ano é regressão óbvia).
- **Skeleton loader em `/pricing`** (`lib/components/pricing-skeleton.svelte`
  - `navigating` de `$app/state` no layout): como a busca de planos já é
    feita 100% no servidor (`+page.server.ts`, nunca fetch client→backend —
    regra arquitetural do projeto), o único momento real de "carregando" é a
    navegação client-side pra essa rota (SvelteKit busca `__data.json` antes
    de trocar a página) — o skeleton substitui o conteúdo antigo durante essa
    janela, sem violar a regra de fetch só-servidor.
- **Card "Enterprise"** na grade de preços — estático (não vem da API, é
  "sob consulta"/sem checkout), mesmo padrão do fallback "Gratuito" já
  existente, mas sempre visível (não condicional). CTA reaproveita o mesmo
  `mailto:suporte@marcelus.app` do rodapé.
- **Nav "Preços"** renomeado de "Planos" pra "Preços" (pt) — texto exato da
  especificação; headline da própria página de preços ("Planos que cabem no
  seu momento") não foi tocado, especificação não pediu.

### Decisões sem confirmação do usuário (perguntadas, sem resposta a tempo)

Sinalizado na resposta ao usuário antes de prosseguir — three perguntas
feitas via pergunta estruturada, sem resposta dentro do timeout:

1. **Blog** — omitido do menu (não criei página "em breve").
2. **E-mail de suporte** — usei `suporte@marcelus.app` como placeholder;
   precisa confirmação/correção do usuário.
3. **Visual do hero** — construído como mockup ilustrativo em código
   (opção recomendada), não como placeholder vazio.

### Verificação feita (desta rodada)

- `bun --cwd=apps/landing run lint` (Prettier + ESLint) — limpo.
- `bunx turbo run typecheck --filter=@finance/landing --force` — 0 erros.
- `node .claude/skills/impeccable/scripts/detect.mjs --json <arquivos>` — 0
  achados.
- `bunx turbo run build --filter=@finance/landing --force` — build completo
  com sucesso, incluindo o adapter Cloudflare (o EPERM de lock do Windows
  visto numa rodada anterior era transitório, não se repetiu).
- Contraste dos elementos novos raciocinado contra os tokens reais de
  `layout.css` (mesmo método da rodada anterior) — nenhuma combinação nova
  introduzida fora dos pares já vetados (`text-background`/`bg-foreground`,
  `text-primary`/`bg-primary/10` sobre `bg-background`, `text-brand-dark`
  sobre `bg-background`).
- **Não verificado visualmente** — sem ferramenta de browser neste
  ambiente. Recomendo fortemente `bun run dev` e olhar a home inteira
  (hero split-screen, dor do usuário, funcionalidades, segurança) e
  `/pricing` (card Enterprise, skeleton ao navegar) em desktop e mobile
  antes de publicar — é a rodada com mais superfície visual nova até agora.
