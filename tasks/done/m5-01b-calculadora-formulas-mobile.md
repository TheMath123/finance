# M5-01b — Calculadora de fórmulas customizadas (app mobile)

**Status:** 🟢 Concluída (2026-07-28)

Fase 2 do [M5-01](m5-01-calculadora-formulas-dashboard.md) (dashboard web),
adiada na sessão original por escopo (mobile precisa de UI própria — teclado
numérico on-screen, não um campo de texto com teclado físico como o
desktop). Implementada quando o usuário testou a versão web, aprovou o
resultado e pediu pra levar direto pro app.

## Decisões

- **Sem digitação livre**: diferente do dashboard (`<input>` real que também
  aceita teclado físico), a expressão no mobile só é editável pelo teclado
  numérico on-screen — mantém a "cara de calculadora" em vez de um campo de
  texto genérico, e evita lidar com o teclado nativo do SO por cima da UI.
- **Sem popover de pin inline**: o dashboard ganhou um ícone de pin com
  popover ao lado de cada fórmula salva (UX refinada depois da v1). O
  mobile não tem componente de popover na registry de UI hoje, então esta
  fase replica a v1 mais simples do dashboard — fixar em Home/Transações é
  feito dentro do próprio formulário de criar/editar (dois `Switch`), e a
  lista de fórmulas salvas só tem Editar/Excluir. Registrado como possível
  melhoria futura, sem task própria por ora (não bloqueia o uso real).
- **Tela própria, não dialog-sobre-dialog**: seguindo o padrão já usado por
  `categories/`, `cards/`, `accounts/` no mobile (nav row na tela "Mais" →
  tela cheia de lista → sub-rotas `new`/`[id]`), em vez de um modal grande
  dentro de outro modal. O teclado + chips de variáveis + preview é
  conteúdo rico demais pra um `Dialog` simples do app.
- **Mesmo pacote `@finance/formula`**: adicionado como dependência de
  `apps/mobile` (`workspace:*`), reaproveitando 100% da lógica de avaliação
  já usada por backend e dashboard — nenhuma reimplementação de parser.
- **Catálogo client-side**: `apps/mobile/src/lib/formula-catalog.ts` espelha
  exatamente `apps/dashboard/src/lib/formula-catalog.ts`
  (`buildClientFormulaCatalog`) — converte o `MonthlySummary` já carregado
  em cada tela (mesmo `summaryApi.getMonthly` que Home/Transações já usam)
  em variáveis em reais, sem round-trip de rede pro preview ao vivo.

## Implementação

- `apps/mobile/package.json`: `"@finance/formula": "workspace:*"`.
- `apps/mobile/src/lib/formula-catalog.ts` e `apps/mobile/src/lib/formula-api.ts`
  (mirror do `server/formula-api.ts` do dashboard, via `apiRequest` do
  client mobile — sem endpoint de `evaluate`/`variables`, o app calcula
  local com o mesmo catálogo).
- `apps/mobile/src/lib/schemas/finance.ts`: `savedFormulaSchema` novo
  (mesmo arquivo único de schemas Zod do domínio financeiro no mobile,
  seguindo a convenção já existente ali).
- `apps/mobile/src/components/form/switch-field.tsx`: campo reutilizável
  novo (RHF + `Switch` do RN) — não existia ainda na pasta `components/form`,
  só `Checkbox`.
- `apps/mobile/src/components/forms/formula-form.tsx`: formulário de
  criar/editar (RHF + zodResolver). Teclado numérico portado do
  `KEYPAD_KEYS` do dashboard, mas reorganizado em `KEYPAD_ROWS` (linhas
  explícitas de `flex-row` com `flex-1`/`flex-[2]`, em vez de
  `flex-wrap` + `width: calc(...)` — React Native não resolve `calc()` em
  estilo). Chips de variáveis, preview ao vivo via `evaluateFormula`, campo
  nome, `Select` de formato e dois `SwitchField` (Início/Transações).
- Telas novas `apps/mobile/src/app/(app)/formulas/index.tsx` (lista,
  com valor calculado e badge "Fixada em ..."), `new.tsx` e
  `[formulaId].tsx` — mesmo padrão de `categories/*`.
- `NavRow` "Calculadora de fórmulas" (ícone `CalculatorIcon`) na tela
  "Mais" (`(tabs)/accounts.tsx`), apontando pra `/formulas`.
- `apps/mobile/src/components/finance/pinned-formulas.tsx`: componente
  compartilhado que busca fórmulas + resumo mensal e renderiza as fixadas
  num campo (`pinnedHome`/`pinnedTransactions`) — some por completo se não
  houver nenhuma, igual ao dashboard. Integrado na Home
  (`(tabs)/index.tsx`, campo `pinnedHome`) e em Transações
  (`(tabs)/explore.tsx`, campo `pinnedTransactions`) — primeira seção
  dinâmica dessas duas telas no mobile (antes eram 100% estáticas).

## Nota técnica — typed routes do Expo Router

Rotas novas (`/formulas`, `/formulas/new`, `/formulas/[formulaId]`) só
aparecem no `tsc --noEmit` depois que o cache local
`.expo/types/router.d.ts` é regenerado — isso acontece automaticamente na
primeira vez que o Metro bundler roda (`expo start`) depois de criar as
rotas; `expo export` sozinho não regenera esse arquivo. Cache local, fora
do git (`.gitignore` do app já cobre `.expo/`), então não é um problema de
código, só um passo manual a rodar uma vez em qualquer ambiente novo antes
de confiar no typecheck de rotas.

## Validação

`bunx tsc --noEmit` do mobile (limpo, depois de regenerar o cache de
typed routes acima), `bun run --filter=@finance/formula typecheck`
(limpo, nenhuma mudança no pacote em si) e `bun run lint` (Biome,
monorepo todo — limpo depois do autofix de organização de imports nos
arquivos novos).

Não foi possível fazer smoke test visual num emulador/dispositivo real
nesta sessão (sem ferramenta de automação de app mobile disponível) — a
verificação ficou limitada a typecheck + lint + revisão do código contra
os mesmos contratos de API já usados e testados pelo backend/dashboard
(M5-01). Recomenda-se um teste manual no Expo Go/emulador antes de
considerar a feature 100% validada em uso real.

## Fora de escopo (ainda)

- Pin inline com popover (mesma UX de conveniência que o dashboard ganhou
  depois da v1) — mobile ainda só fixa via formulário de criar/editar.
- Melhorar a exibição das variáveis no seletor (nome completo hoje pode
  ficar longo/ruim de ler nos chips) — mencionado pelo usuário como algo a
  revisitar depois, mas explicitamente adiado por ele nesta sessão.
