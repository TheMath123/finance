/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1e293b', // slate-800
    background: '#fdfffc',
    backgroundElement: '#f1f5f9', // slate-100
    backgroundSelected: '#e2e8f0', // slate-200
    textSecondary: '#64748b', // slate-500
  },
  dark: {
    text: '#ffffff',
    background: '#010b14',
    backgroundElement: '#0f172a', // slate-900
    backgroundSelected: '#1e293b', // slate-800
    textSecondary: '#94a3b8', // slate-400
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Cores de marca (mesmo hex em light/dark, ao contrário de `Colors`) — usadas em componentes
 * Phosphor (`color` é uma prop de string, não aceita classe Tailwind), pra não ficar cor solta
 * inline pelas telas. Mesmos valores dos tokens `primary`/`destructive`/`success` do `global.css`.
 */
export const BrandColors = {
  primary: '#2ec4b6',
  destructive: '#fb2c36',
  success: '#00c950',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
