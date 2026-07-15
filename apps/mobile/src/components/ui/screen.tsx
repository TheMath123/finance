import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';

export interface ScreenProps {
  children: ReactNode;
  /** Centraliza o conteúdo verticalmente (telas curtas, como login/registro). */
  center?: boolean;
  className?: string;
}

export function Screen({ children, center = false, className = '' }: ScreenProps) {
  return (
    <ThemedView className="flex-1">
      <SafeAreaView
        className={`flex-1 gap-4 px-6 ${center ? 'justify-center' : 'pt-6'} ${className}`}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}
