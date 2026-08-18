import ClarityRN from '@microsoft/react-native-clarity';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  router,
  Slot,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/context/session';
import { ThemePreferenceProvider } from '@/context/theme-preference';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { handleNotificationAction } from '@/lib/notification-actions';
import {
  addNotificationResponseListener,
  notificationTargetRoute,
} from '@/lib/push-notifications';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    // Heatmap + gravação de sessão (analytics). Sem project ID configurado,
    // não inicializa nada — e em dev (Expo Go/dev client local) fica de fora
    // de propósito pra não poluir o painel com sessões de desenvolvimento.
    const projectId = process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID;
    if (!projectId || __DEV__) return;
    ClarityRN.initialize(projectId);
  }, []);

  useEffect(() => {
    return addNotificationResponseListener((response) => {
      if (response.kind === 'action') {
        void handleNotificationAction(response.actionIdentifier, response.data);
        return;
      }
      // Toque no corpo da notificação (app em background ou fechado) — navega pro destino do payload.
      const target = notificationTargetRoute(response.data);
      if (target) router.push(target as never);
    });
  }, []);

  return (
    // Pré-requisito do react-native-gesture-handler (usado pelo drag-and-drop
    // dos widgets fixados, M5-01c) — sem isso os gestos de arraste não funcionam.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Nunca reagia ao tema (nem ao automático do SO, nem à preferência manual do
          app) — não existia NENHUM <StatusBar/> renderizado, então ficava preso no
          default nativo, ilegível quando o fundo virava a cor oposta. `style`
          explícito a partir do MESMO colorScheme (nativewind) que já pinta o resto
          da UI, não `Appearance` do SO direto. */}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemePreferenceProvider>
            <SessionProvider>
              <ThemeProvider
                value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
              >
                {/* `key` força remount de toda a árvore quando o tema muda —
                    telas/Cards já montados antes da troca (ex.: aba "Mais")
                    ficavam com a classe `.dark` do NativeWind resolvida uma
                    vez só, no primeiro render, e nunca reaplicavam depois
                    (bug real relatado: card branco sólido, texto sem
                    contraste, mesmo com o resto da UI já escuro). Perde
                    estado de navegação/scroll na hora da troca — aceitável,
                    é uma ação deliberada e rara do usuário (Perfil > Tema). */}
                <Slot key={colorScheme} />
              </ThemeProvider>
            </SessionProvider>
          </ThemePreferenceProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
