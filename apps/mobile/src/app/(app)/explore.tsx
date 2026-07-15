import { ReceiptIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';

export default function TransactionsScreen() {
  return (
    <Screen className="gap-4 pb-28">
      <ThemedText type="subtitle">Transações</ThemedText>

      <Card className="items-center gap-3 py-10">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ReceiptIcon size={22} color="#2563EB" />
        </View>
        <ThemedText type="smallBold">Nenhuma transação ainda</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Lançamentos de contas e cartões deste workspace aparecem aqui.
        </ThemedText>
      </Card>
    </Screen>
  );
}
