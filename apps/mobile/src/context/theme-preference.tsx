import { colorScheme } from 'nativewind';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { type ThemePreference, themeStore } from '@/lib/secure-store';

interface ThemePreferenceContextValue {
  /** 'system' segue o Appearance do SO automaticamente (comportamento padrão do NativeWind quando nunca sobrescrito). */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemePreferenceContext =
  createContext<ThemePreferenceContextValue | null>(null);

/**
 * Tema manual (Claro/Escuro/Automático) — equivalente ao card "Tema" da
 * conta no dashboard. `colorScheme.set()` (NativeWind) é um observable
 * global, não Context: chamar aqui já basta pra tudo que usa `dark:` ou os
 * tokens de cor do global.css reagir, em qualquer lugar da árvore.
 */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    themeStore.getPreference().then((stored) => {
      setPreferenceState(stored);
      colorScheme.set(stored);
    });
  }, []);

  const setPreference = async (next: ThemePreference) => {
    await themeStore.setPreference(next);
    setPreferenceState(next);
    colorScheme.set(next);
  };

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error(
      'useThemePreference precisa estar dentro de <ThemePreferenceProvider>'
    );
  }
  return context;
}
