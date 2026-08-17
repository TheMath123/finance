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
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemePreferenceProvider>
            <SessionProvider>
              <ThemeProvider
                value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
              >
                <Slot />
              </ThemeProvider>
            </SessionProvider>
          </ThemePreferenceProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
