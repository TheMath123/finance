# UI — Migração pro novo padrão visual (Figma)

**Status:** 🟡 Em andamento (2026-07-24) — Fases 1 e 2 concluídas e
validadas pelo usuário no emulador (commitadas em `88fc053`). **Fase 3
implementada** (código pronto, falta validação manual do usuário no
emulador) — feita de carona durante o M4 (dashboard web ganhou a mesma
feature e o formato de URL do thesvg precisou ser confirmado ali mesmo).

## Contexto

Migrar o app mobile pro novo padrão visual definido no Figma (fileKey
`hPMawz29XBa9zKrTMMz2og`), usando paleta padrão do Tailwind (neutros/slate) +
paleta nova exportada do Coolors.co (teal/vermelho/verde), e mostrando logo de
marca (Netflix, AliExpress etc.) no card de transação, puxado do
`thesvg.org` (auditoria de segurança feita: projeto open-source ativo, MIT,
sem sinais de risco técnico — ressalva é legal, não técnica: logos continuam
marca registrada de cada empresa, então é enhancement visual com fallback
garantido, nunca dependência obrigatória).

Feito em 3 fases com checkpoint do usuário entre elas:
1. Fundação (tokens de cor + componentes base).
2. Telas (Home, Transações + filtros).
3. Logo de marca via thesvg.

Plano completo (contexto do Figma, gaps encontrados no código, decisões) em
`C:\Users\Matheus\.claude\plans\leia-o-spec-md-e-glittery-curry.md`.

## Fase 1 — Fundação (feito)

- **Paleta unificada**: `apps/mobile/src/global.css` (tokens HSL do AniUI,
  `:root`/`.dark`) e `apps/mobile/src/constants/theme.ts` (`Colors.light/dark`,
  usado por `ThemedText`/`ThemedView`) agora usam os mesmos valores — antes
  eram duas paletas paralelas não sincronizadas. Primary = teal `#2ec4b6`,
  destructive = vermelho `#fb2c36` (era azul/vermelho genérico shadcn antes),
  **novo token `success`** = verde `#00c950` (não existia). Neutros (`secondary`/
  `muted`/`accent`/`border`/`text*`) migrados pra escala slate padrão do
  Tailwind. `--radius` de `0.75rem` → `0.5rem` (8px, conforme design).
- `apps/mobile/tailwind.config.js`: token `success` adicionado (mesmo padrão de
  `destructive`).
- `apps/mobile/src/components/ui/button.tsx`: variante `success` nova (bg +
  texto + heurística de cor do `ActivityIndicator` de loading).
- `apps/mobile/src/components/ui/card.tsx`: padding `p-6` → `p-4` (mais
  compacto, alinhado à grade de espaçamento do design).
- `apps/mobile/src/components/app-tabs.tsx`: removida a sombra
  (`shadow-md` → `border border-border`) — design é flat, sem elevação.
- **Novo**: `apps/mobile/src/lib/category-icons.ts` — `resolveCategoryIcon(icon)`
  resolve o campo `Category.icon` (slug livre tipo `"shopping-cart"`, hoje
  puramente decorativo/nunca renderizado) pro componente Phosphor equivalente
  (`ShoppingCartIcon`), com fallback pro `TagIcon` genérico. Pré-requisito pro
  avatar da Fase 2.

Typecheck limpo (`bun run --filter=mobile typecheck`).

## Fase 2 — Telas (feito, refeita depois de feedback do usuário)

Primeira versão só recolorira a estrutura já existente das telas (cores novas
em cima do layout antigo). O usuário apontou que isso fugia bastante do
layout/estrutura real do Figma — refeito puxando `get_design_context` (código
de referência + screenshot) de cada node antes de reescrever, em vez de só
aplicar cor.

Diferenças estruturais reais encontradas (não só de cor):
- **Tab bar** (`14:65`/`14:127`): só ícone, **sem label de texto** nenhum;
  barra compacta (58px altura, 42px por ícone, não estica a largura toda);
  fundo translúcido teal (`bg-primary/10`), sem sombra/borda. Reescrito em
  `apps/mobile/src/components/app-tabs.tsx`.
- **Home** (`1:3`/`14:2`) e **Transações** (`30:283`/`33:740`) reaproveitam o
  **mesmo bloco** "saldo disponível + Receitas/Despesas" — virou componente
  compartilhado `apps/mobile/src/components/finance/balance-overview.tsx` em
  vez de duplicar. Receitas/Despesas: cards com **borda** (`border-foreground/10`),
  **sem** círculo de fundo atrás do ícone (ícone solto). As linhas de
  "Próxima fatura"/"Recorrências"/"Projeção" na Home **não são `Card`** — são
  linhas soltas com divisor no topo (`border-t border-foreground/10`) e um
  ícone de seta (`CaretRightIcon`) no canto, sem caixa/borda ao redor.
- **Pílulas do cabeçalho** (seletor de workspace, categoria, filtro, recorrências,
  arquivadas): todas usam a **mesma** instância de componente no Figma
  (`bg-primary/10`, `rounded` 4px, sem borda) — virou `HeaderChip` compartilhado
  (`apps/mobile/src/components/finance/header-chip.tsx`), substituindo os
  botões circulares com borda que eu tinha feito antes.
- **Card de transação** (`30:57`): não é um `Card` com padding/borda — é uma
  linha com divisor no topo, igual às da Home. Avatar 40px translúcido
  (teal/verde conforme despesa/receita) com o ícone da categoria. Ganhou a
  linha "método/conta • data" (`Cartão Z • 10/07/2026`, `PIX • 18/07/2026`,
  `Conta A • 24/07/2026`) via `transactionSourceLabel()` (prioriza nome do
  cartão/conta quando dá pra identificar, senão o método genérico). Valor:
  só despesa leva `- ` na frente (receita não leva `+`), 14px medium.
  Parcelado mostra o total da compra + fração acima do valor; split mostra
  "Dividido" (o Figma mostra uma fração "3/4" que não temos dado equivalente
  hoje — usei o texto que já existia).
- **Filtros**: painel reaproveita `Select`/`DatePicker` existentes com
  `className` sobrescrevendo pra parecer com a pílula do Figma (sem borda
  visível, fundo translúcido) — **limitação conhecida**: o texto interno
  desses componentes é fixo (`text-base`, 16px) e não dá pra encolher pra
  12px via prop sem mexer no componente compartilhado (usado em várias
  outras telas), então esses campos ficam com o texto um pouco maior que o
  Figma. Ícone do botão de filtro troca de glyph (`FunnelIcon`/`FunnelXIcon`)
  em vez de só cor/peso, igual ao Figma.
- **FAB**: era círculo 56px com sombra — Figma é quadrado arredondado 42px
  (`rounded-lg`), sem sombra.

**Limitações desta rodada** (bati no limite de chamadas do Figma MCP no plano
Starter no meio do trabalho):
- Não confirmei o componente `Button` (node `21:474`) contra o Figma —
  os tamanhos/variantes atuais (Fase 1) não foram revalidados.
- Não abri a variante light da tela de Transações (`30:288`/`32:504`)
  diretamente — assumi o mesmo padrão claro/escuro já confirmado duas vezes
  na Home (só troca de cor de texto/borda, estrutura idêntica).

Typecheck e lint limpos (`bun run --filter=mobile typecheck`, `bun run lint`
— nenhum erro novo nos arquivos tocados).

## Fase 3 — Logo de marca via thesvg (feita em 2026-07-24)

URL do asset confirmada manualmente (curl direto, não via WebFetch — o
site é uma SPA em Next.js, HTML inicial não expõe o link real):
`https://thesvg.org/icons/{slug}/default.svg`, `Content-Type: image/svg+xml`,
testada contra ~15 marcas (netflix, spotify, uber, uber-eats, ifood, amazon,
aliexpress, nubank, shopee, steam, playstation, xbox, disney-plus, hbo-max,
whatsapp, telegram, youtube, picpay, itau, bradesco, santander, zoom — todas
200).

- `apps/mobile/src/lib/merchant-logo.ts` — `MERCHANT_LOGOS` (~24 marcas
  curadas) + `getMerchantLogoUrl(description)`, match por palavra-chave
  case-insensitive (ordenado por tamanho da keyword — "uber eats" checado
  antes de "uber" pra não dar match errado).
- `TransactionRow` (`explore.tsx`): usa `expo-image` (já confirmado no
  código nativo que decodifica SVG remoto tanto no Android
  — `androidsvg`/Glide — quanto no iOS) pra renderizar a logo no lugar do
  ícone Phosphor da categoria, com `onError` caindo pro ícone de novo —
  fallback garantido, nunca quebra a lista se o asset falhar.
- Mesmíssima lista/lógica implementada em paralelo no dashboard web
  (`apps/dashboard/src/lib/merchant-logo.ts`) — os dois ficam em sync
  manualmente por ora (arquivos pequenos, sem framework compartilhado
  entre React Native e Svelte que justifique extrair pra
  `packages/shared`).

**Não validado ainda**: rodar no emulador com uma transação "Netflix",
"compra aliexpress" etc. e confirmar que a logo aparece e que texto sem
marca reconhecida cai no ícone da categoria sem quebrar.

## Próximo passo

Pedir pro usuário validar a Fase 3 no emulador (logo aparecendo pra
marcas conhecidas, fallback ok). Se o limite de chamadas do Figma MCP já
tiver resetado, revalidar o `Button` (`21:474`) e a variante light da
tela de Transações que ficaram sem confirmação direta na Fase 2.
