import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

/**
 * Mesma assinatura do `useColorScheme` do React Native (`'light' | 'dark' |
 * undefined`), mas lendo do NativeWind em vez do `Appearance` do SO direto —
 * reflete a preferência manual (Claro/Escuro/Automático, ver
 * context/theme-preference.tsx) quando o usuário sobrescreveu; 'Automático'
 * cai pro Appearance sozinho, sem diferença de comportamento.
 */
export function useColorScheme() {
  return useNativeWindColorScheme().colorScheme;
}
