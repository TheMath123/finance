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

- **Paleta:** marfim/papel quente (`hsl(42 26% 96%)`) no claro, carvão/espresso
  quente (`hsl(30 12% 7%)`) no escuro — nunca branco-azulado nem preto-azulado
  (esses lêem "tech", não "banco privado"). `--primary` (teal `#2ec4b6`) é
  **idêntico** ao resto do produto (dashboard/mobile) — marca não muda, só a
  moldura ao redor dela. Sem segundo acento de cor: elementos informativos
  (ícones de feature, badge de trial) usam só preto-e-branco
  (`--foreground`/`--muted-foreground`) — decisão revisada após o primeiro
  acento (`--brass`, dourado/latão) entrar em conflito de matiz com o teal
  (ambos ~174-175° de hue, só diferiam em brilho/saturação); o teal segue
  como a única cor saturada da página, reservada só pra ação.
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
