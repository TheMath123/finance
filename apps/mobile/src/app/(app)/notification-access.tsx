import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeftIcon,
  BellRingingIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  isNotificationAccessGranted,
  notificationListenerAvailable,
  openNotificationAccessSettings,
} from '@/lib/notification-listener';
import { pendingTransactionStore } from '@/lib/pending-transaction-store';
import { notificationCaptureStore } from '@/lib/secure-store';

const SUPPORTED_BANKS = [
  'Nubank',
  'Banco Inter',
  'PicPay',
  'Mercado Pago',
  'C6 Bank',
  'Itaú',
  'Bradesco',
  'Banco do Brasil',
  'Santander',
  'Caixa',
];

export default function NotificationAccessScreen() {
  const theme = useTheme();
  const [granted, setGranted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-notification-suggestions'],
    queryFn: async () => (await pendingTransactionStore.list()).length,
  });

  useFocusEffect(
    useCallback(() => {
      setGranted(isNotificationAccessGranted());
      notificationCaptureStore.getEnabled().then((value) => {
        setEnabled(value);
        setLoaded(true);
      });
    }, [])
  );

  const handleToggle = async (value: boolean) => {
    if (value && !granted) {
      openNotificationAccessSettings();
      return;
    }
    setEnabled(value);
    await notificationCaptureStore.setEnabled(value);
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
        <ThemedText type="subtitle">Detecção automática</ThemedText>
      </View>

      {!notificationListenerAvailable ? (
        <Card className="items-center gap-3 py-10">
          <WarningCircleIcon size={22} color="#B45309" />
          <ThemedText type="smallBold" style={{ textAlign: 'center' }}>
            Recurso disponível só no Android
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={{ textAlign: 'center' }}
          >
            O iOS não dá acesso a notificações de outros apps — não existe forma
            de fazer isso nele.
          </ThemedText>
        </Card>
      ) : (
        <>
          <Card className="gap-3">
            <View className="flex-row items-center gap-3">
              <View
                className={
                  granted
                    ? 'h-9 w-9 items-center justify-center rounded-full bg-success/10'
                    : 'h-9 w-9 items-center justify-center rounded-full bg-amber-500/15'
                }
              >
                {granted ? (
                  <CheckCircleIcon size={18} color="#16A34A" weight="fill" />
                ) : (
                  <WarningCircleIcon size={18} color="#B45309" />
                )}
              </View>
              <View className="flex-1">
                <ThemedText type="smallBold">
                  {granted ? 'Permissão concedida' : 'Permissão não concedida'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {granted
                    ? 'O Marcelus pode ler notificações do sistema.'
                    : 'Precisa ser ativada nas Configurações do Android.'}
                </ThemedText>
              </View>
            </View>
            {!granted && (
              <Button
                variant="outline"
                onPress={openNotificationAccessSettings}
              >
                Abrir configurações do Android
              </Button>
            )}
          </Card>

          <Card className="flex-row items-center gap-3">
            <View className="flex-1">
              <ThemedText type="smallBold">
                Detectar transações automaticamente
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Notificações de compra/pagamento de bancos e cartões viram
                sugestões — nunca uma transação lançada direto.
              </ThemedText>
            </View>
            <Switch
              value={loaded && enabled}
              onValueChange={handleToggle}
              disabled={!loaded}
              trackColor={{ false: '#d4d4d8', true: BrandColors.primary }}
            />
          </Card>

          <Pressable
            onPress={() => router.push('/notification-suggestions')}
            className="active:opacity-70"
          >
            <Card className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <BellRingingIcon size={18} color={BrandColors.primary} />
                </View>
                <ThemedText type="smallBold">Sugestões pendentes</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {pendingCount ?? 0}
              </ThemedText>
            </Card>
          </Pressable>

          <View className="gap-2">
            <ThemedText type="small" themeColor="textSecondary">
              Bancos e carteiras reconhecidos hoje
            </ThemedText>
            <View className="flex-row flex-wrap gap-2">
              {SUPPORTED_BANKS.map((bank) => (
                <View key={bank} className="rounded-full bg-muted px-3 py-1.5">
                  <ThemedText type="small">{bank}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
