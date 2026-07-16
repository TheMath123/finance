import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationType } from '@finance/shared';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { notificationApi } from '@/lib/notification-api';

const TYPE_LABELS: Record<NotificationType, { title: string; description: string }> = {
  workspace_invite: {
    title: 'Convites de workspace',
    description: 'Quando alguém te convida pra um workspace compartilhado.',
  },
  invoice_closed: {
    title: 'Fatura fechou',
    description: 'Quando a fatura de um cartão fecha.',
  },
  invoice_due: {
    title: 'Fatura vence hoje',
    description: 'No dia do vencimento de uma fatura ainda não paga.',
  },
  recurring_pending: {
    title: 'Recorrência pendente',
    description: 'Quando uma recorrência prevista pro dia ainda não foi confirmada.',
  },
};

export default function NotificationSettingsScreen() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationApi.listPreferences,
  });

  const toggle = async (type: NotificationType, enabled: boolean) => {
    queryClient.setQueryData(['notification-preferences'], (old: typeof preferences) =>
      old?.map((p) => (p.type === type ? { ...p, enabled } : p)),
    );
    try {
      await notificationApi.updatePreference(type, enabled);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    }
  };

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Notificações</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <View className="gap-3">
          {preferences?.map((preference) => (
            <Card key={preference.type} className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <ThemedText type="smallBold">{TYPE_LABELS[preference.type]?.title ?? preference.type}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {TYPE_LABELS[preference.type]?.description ?? ''}
                </ThemedText>
              </View>
              <Switch
                value={preference.enabled}
                onValueChange={(value) => toggle(preference.type, value)}
                trackColor={{ false: '#d4d4d8', true: '#2563EB' }}
              />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
