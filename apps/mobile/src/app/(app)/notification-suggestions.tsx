import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  BellRingingIcon,
  CheckIcon,
  XIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { CreateTransactionForm } from '@/components/forms/create-transaction-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCents } from '@/lib/money';
import {
  type PendingSuggestion,
  pendingTransactionStore,
} from '@/lib/pending-transaction-store';

const QUERY_KEY = ['pending-notification-suggestions'];

function SuggestionRow({
  suggestion,
  onAdd,
  onIgnore,
}: {
  suggestion: PendingSuggestion;
  onAdd: () => void;
  onIgnore: () => void;
}) {
  const theme = useTheme();

  return (
    <Card className="gap-3">
      <View>
        <ThemedText type="smallBold">{suggestion.bankLabel}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {suggestion.rawText ?? suggestion.rawTitle ?? suggestion.description}
        </ThemedText>
      </View>
      <View className="flex-row items-center justify-between">
        <ThemedText type="subtitle">
          {formatCents(suggestion.amountCents)}
        </ThemedText>
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<XIcon size={14} color={theme.text} />}
            onPress={onIgnore}
          >
            Ignorar
          </Button>
          <Button
            size="sm"
            icon={<CheckIcon size={14} weight="bold" color="#FFFFFF" />}
            onPress={onAdd}
          >
            Adicionar
          </Button>
        </View>
      </View>
    </Card>
  );
}

export default function NotificationSuggestionsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<PendingSuggestion | null>(null);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: pendingTransactionStore.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const ignore = async (id: string) => {
    await pendingTransactionStore.remove(id);
    invalidate();
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Transações detectadas</ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Valores lidos de notificações de banco/cartão — revise antes de
        adicionar, nada é lançado automaticamente.
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator />
      ) : suggestions && suggestions.length > 0 ? (
        <View className="gap-2">
          {suggestions.map((suggestion) => (
            <SuggestionRow
              key={suggestion.id}
              suggestion={suggestion}
              onAdd={() => setConfirming(suggestion)}
              onIgnore={() => ignore(suggestion.id)}
            />
          ))}
        </View>
      ) : (
        <Card className="items-center gap-3 py-10">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <BellRingingIcon size={22} color={BrandColors.primary} />
          </View>
          <ThemedText type="smallBold">Nenhuma sugestão pendente</ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={{ textAlign: 'center' }}
          >
            Quando o app detectar uma notificação de compra/pagamento, ela
            aparece aqui.
          </ThemedText>
        </Card>
      )}

      <Dialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar transação</DialogTitle>
          </DialogHeader>
          {confirming && (
            <CreateTransactionForm
              initialValues={{
                description: confirming.description,
                amount: confirming.amountCents,
                type: confirming.typeGuess,
                method: confirming.methodGuess ?? undefined,
              }}
              onDone={async () => {
                await pendingTransactionStore.remove(confirming.id);
                invalidate();
                setConfirming(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
