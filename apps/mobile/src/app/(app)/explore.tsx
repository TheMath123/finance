import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function TransactionsScreen() {
  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1 items-center justify-center gap-2 px-6">
        <ThemedText type="title">Transações</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Lista de transações do workspace aparece aqui.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}
