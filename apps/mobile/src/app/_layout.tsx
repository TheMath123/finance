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
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/context/session';
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
          <SessionProvider>
            <ThemeProvider
              value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
            >
              <Slot />
            </ThemeProvider>
          </SessionProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
