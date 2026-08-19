/**
 * Fonte única dos tokens de cor (design system) — espelha 1:1 os valores de
 * `global.css` (`:root`/`.dark`), mas entregues via `vars()` (Reanimated-style,
 * runtime do próprio NativeWind) em vez de depender da classe `.dark` sendo
 * alternada no elemento raiz nativo.
 *
 * Causa raiz do bug real em produção (auditoria 2026-08-18): `darkMode:
 * 'class'` do NativeWind depende de `Appearance.setColorScheme()` (chamado
 * por `colorScheme.set()` em context/theme-preference.tsx) propagar até o
 * mecanismo nativo que aplica `.dark` — e isso nunca aconteceu de forma
 * confiável neste app (cards continuavam brancos, texto sem contraste, MESMO
 * depois de forçar remount da árvore inteira). Componentes que já liam a cor
 * via JS puro (`ThemedText`/`ThemedView`, com `useTheme()` + `style` inline)
 * sempre funcionaram — só a metade do app que usa classes Tailwind baseadas
 * em `hsl(var(--x))` ficava presa no valor claro.
 *
 * `vars()` é um `style` de verdade (não uma classe) — reage a re-render do
 * React normalmente, com a MESMA confiabilidade que já validamos em
 * ThemedText/ThemedView/StatusBar. Aplicado num <View> (react-native puro) no
 * topo da árvore (app/_layout.tsx) — precisa ser especificamente um
 * componente que passa pelo swap do react-native-css-interop (View/Text/...;
 * ver node_modules/react-native-css-interop/src/runtime/components.ts), ou o
 * `style` com `vars()` é um no-op silencioso — toda classe
 * `bg-card`/`text-foreground`/`border-input`/etc. já espalhada pelo app
 * continua funcionando exatamente como escrita — só passa a resolver o
 * valor certo de verdade.
 */
export const lightVars = {
  background: '100 100% 99%',
  foreground: '217 33% 17%',
  card: '100 100% 99%',
  'card-foreground': '217 33% 17%',
  primary: '174 62% 47%',
  'primary-foreground': '0 0% 100%',
  secondary: '210 40% 96%',
  'secondary-foreground': '217 33% 17%',
  muted: '210 40% 96%',
  'muted-foreground': '215 16% 47%',
  accent: '214 32% 91%',
  'accent-foreground': '217 33% 17%',
  destructive: '357 96% 58%',
  'destructive-foreground': '0 0% 100%',
  success: '144 100% 39%',
  'success-foreground': '0 0% 100%',
  border: '214 32% 91%',
  input: '214 32% 91%',
  ring: '174 62% 47%',
} as const;

export const darkVars = {
  background: '208 90% 4%',
  foreground: '0 0% 100%',
  card: '222 47% 11%',
  'card-foreground': '0 0% 100%',
  primary: '174 62% 47%',
  'primary-foreground': '0 0% 100%',
  secondary: '217 33% 17%',
  'secondary-foreground': '0 0% 100%',
  muted: '217 33% 17%',
  'muted-foreground': '215 20% 65%',
  accent: '215 25% 27%',
  'accent-foreground': '0 0% 100%',
  destructive: '357 75% 42%',
  'destructive-foreground': '0 0% 100%',
  success: '144 100% 30%',
  'success-foreground': '0 0% 100%',
  border: '217 33% 17%',
  input: '217 33% 17%',
  ring: '174 62% 47%',
} as const;
