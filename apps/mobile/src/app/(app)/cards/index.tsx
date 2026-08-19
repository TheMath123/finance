import { getBank } from '@finance/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon, CreditCardIcon, PlusIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { cardsApi } from '@/lib/cards-api';
import { cn } from '@/lib/cn';
import { formatCents } from '@/lib/money';

export default function CardsScreen() {
  const theme = useTheme();
  const { workspaceId } = useSession();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const bankName = (bankCode: string) => getBank(bankCode)?.name ?? bankCode;

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="active:opacity-60"
          >
            <ArrowLeftIcon size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle">Cartões</ThemedText>
        </View>
        <Pressable
          onPress={() => router.push('/cards/new')}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
        >
          <PlusIcon size={18} color={BrandColors.primary} weight="bold" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : cards && cards.length > 0 ? (
        cards.map((cardItem) => (
          <Pressable
            key={cardItem.id}
            onPress={() => router.push(`/cards/${cardItem.id}`)}
          >
            <Card
              className={cn(
                'flex-row items-center justify-between',
                cardItem.archivedAt && 'opacity-50'
              )}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <CreditCardIcon size={18} color={BrandColors.primary} />
                </View>
                <View>
                  <View className="flex-row items-center gap-2">
                    <ThemedText type="smallBold">{cardItem.name}</ThemedText>
                    {cardItem.archivedAt && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Arquivado
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {bankName(cardItem.bankCode)}
                  </ThemedText>
                </View>
              </View>
              <View className="items-end">
                <ThemedText type="small" themeColor="textSecondary">
                  Disponível
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatCents(cardItem.availableLimit)}
                </ThemedText>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card className="items-center py-6">
          <ThemedText type="small" themeColor="textSecondary">
            Nenhum cartão cadastrado ainda.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
