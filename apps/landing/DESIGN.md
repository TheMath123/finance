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
