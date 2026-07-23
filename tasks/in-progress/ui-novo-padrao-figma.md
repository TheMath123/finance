# UI — Migração pro novo padrão visual (Figma)

**Status:** 🟡 Em progresso — Fase 1 (fundação) implementada, aguardando o usuário
conferir no emulador antes da Fase 2.

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

## Fase 2 — Telas (a fazer)

- Home (`(tabs)/index.tsx`): restilizar cards existentes com os tokens novos;
  seletor de workspace vira visualmente uma pílula.
- Transações (`(tabs)/explore.tsx`): restilizar lista/header/filtros/FAB;
  `TransactionRow` ganha avatar circular 40px (translúcido teal/verde por
  tipo) com o ícone da categoria via `resolveCategoryIcon`.

## Fase 3 — Logo de marca via thesvg (a fazer)

- `apps/mobile/src/lib/merchant-logo.ts`: lista curada de marcas conhecidas →
  slug do thesvg, match por palavra-chave na descrição da transação
  (case-insensitive, sem campo novo). Confirmar o path exato do asset no
  thesvg antes de codar a URL final.
- Fallback pro ícone da categoria quando não há marca reconhecida.

## Próximo passo

Nada disto foi visto rodando de verdade ainda — pedir pro usuário conferir a
Fase 1 no emulador (cores, botões, tab bar) antes de eu seguir pra Fase 2.
