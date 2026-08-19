import type { NotificationType } from '@finance/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notificationApi } from '@/lib/notification-api';

const TYPE_LABELS: Record<
  NotificationType,
  { title: string; description: string }
> = {
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
    description:
      'Quando uma recorrência prevista pro dia ainda não foi confirmada.',
  },
  whatsapp_linked: {
    title: 'WhatsApp vinculado',
    description: 'Quando um número de WhatsApp é vinculado à sua conta.',
  },
  transfer_pending: {
    title: 'Transferência recebida',
    description: 'Quando alguém te envia uma transferência pendente de aceite.',
  },
  transfer_accepted: {
    title: 'Transferência aceita',
    description: 'Quando uma transferência que você enviou é aceita.',
  },
  split_payment_pending: {
    title: 'Parte de split pendente',
    description: 'Quando alguém divide uma despesa com você.',
  },
  split_payment_paid: {
    title: 'Split marcado como pago',
    description:
      'Quando um participante marca a parte dele como paga — falta você confirmar.',
  },
  split_reimbursement_confirmed: {
    title: 'Reembolso de split confirmado',
    description: 'Quando seu pagamento de uma parte é confirmado.',
  },
};

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationApi.listPreferences,
  });

  const toggle = async (type: NotificationType, enabled: boolean) => {
    queryClient.setQueryData(
      ['notification-preferences'],
      (old: typeof preferences) =>
        old?.map((p) => (p.type === type ? { ...p, enabled } : p))
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
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Notificações</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <View className="gap-3">
          {preferences?.map((preference) => (
            <Card
              key={preference.type}
              className="flex-row items-center justify-between gap-3"
            >
              <View className="flex-1">
                <ThemedText type="smallBold">
                  {TYPE_LABELS[preference.type]?.title ?? preference.type}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {TYPE_LABELS[preference.type]?.description ?? ''}
                </ThemedText>
              </View>
              <Switch
                value={preference.enabled}
                onValueChange={(value) => toggle(preference.type, value)}
                trackColor={{ false: '#d4d4d8', true: BrandColors.primary }}
              />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
