import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { cn } from '@/lib/cn';

export interface ScreenProps {
  children: ReactNode;
  /** Centraliza o conteúdo verticalmente (telas curtas, como login/registro). */
  center?: boolean;
  className?: string;
  /** Desliga o scroll — só pra telas que já rolam sozinhas (ex.: FlatList interna). */
  scroll?: boolean;
}

export function Screen({
  children,
  center = false,
  className,
  scroll = true,
}: ScreenProps) {
  if (!scroll) {
    return (
      <ThemedView className="flex-1">
        <SafeAreaView
          className={cn(
            'flex-1 gap-4 px-6',
            center ? 'justify-center' : 'pt-6',
            className
          )}
        >
          {children}
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerClassName={cn(
            'gap-4 px-6',
            center ? 'flex-grow justify-center' : 'pt-6',
            className
          )}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
