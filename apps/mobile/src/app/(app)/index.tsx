import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1 items-center justify-center gap-2 px-6">
        <ThemedText type="title">Resumo</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Saldo e faturas do mês aparecem aqui.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}
