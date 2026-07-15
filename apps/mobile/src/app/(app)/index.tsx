import { TrendUpIcon, TrendDownIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';

export default function HomeScreen() {
  return (
    <Screen className="gap-6 pb-28">
      <View>
        <ThemedText type="small" themeColor="textSecondary">
          Saldo disponível
        </ThemedText>
        <ThemedText type="title">R$ 0,00</ThemedText>
      </View>

      <View className="flex-row gap-3">
        <Card className="flex-1 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-green-500/15">
            <TrendUpIcon size={18} color="#16A34A" weight="bold" />
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Receitas
            </ThemedText>
            <ThemedText type="smallBold">R$ 0,00</ThemedText>
          </View>
        </Card>

        <Card className="flex-1 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-red-500/15">
            <TrendDownIcon size={18} color="#DC2626" weight="bold" />
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Despesas
            </ThemedText>
            <ThemedText type="smallBold">R$ 0,00</ThemedText>
          </View>
        </Card>
      </View>

      <Card className="items-center gap-2 py-8">
        <ThemedText type="smallBold">Nenhuma fatura este mês</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Suas próximas faturas de cartão aparecem aqui.
        </ThemedText>
      </Card>
    </Screen>
  );
}
