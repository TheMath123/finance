import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArchiveIcon,
  BellIcon,
  CalendarCheckIcon,
  CreditCardIcon,
  GearIcon,
  HandCoinsIcon,
  PaperPlaneTiltIcon,
  UsersIcon,
  WhatsappLogoIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { notificationApi, type NotificationView } from '@/lib/notification-api';
import { notificationTargetRoute } from '@/lib/push-notifications';

const TYPE_ICONS: Record<string, typeof BellIcon> = {
  workspace_invite: UsersIcon,
  invoice_closed: CreditCardIcon,
  invoice_due: CreditCardIcon,
  recurring_pending: CalendarCheckIcon,
  whatsapp_linked: WhatsappLogoIcon,
  transfer_pending: HandCoinsIcon,
  transfer_accepted: PaperPlaneTiltIcon,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function NotificationsScreen() {
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', showArchived],
    queryFn: () => notificationApi.list(showArchived),
    // Sempre busca de novo ao abrir a aba — o padrão global (60s) deixava a lista
    // de notificações parecer travada logo depois de uma nova chegar.
    staleTime: 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const openNotification = async (notification: NotificationView) => {
    if (!notification.readAt) await notificationApi.markRead(notification.id).catch(() => {});
    refresh();
    const target = notificationTargetRoute(notification.data ?? undefined);
    if (target) router.push(target as never);
  };

  const archive = async (notification: NotificationView) => {
    await notificationApi.archive(notification.id).catch(() => {});
    refresh();
  };

  const unarchive = async (notification: NotificationView) => {
    await notificationApi.unarchive(notification.id).catch(() => {});
    refresh();
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center justify-between">
        <ThemedText type="subtitle">Notificações</ThemedText>
        <Pressable
          onPress={() => router.push('/notification-settings')}
          hitSlop={8}
          className="active:opacity-60">
          <GearIcon size={22} />
        </Pressable>
      </View>

      <View className="flex-row gap-2">
        <Button
          variant={showArchived ? 'outline' : 'default'}
          size="sm"
          onPress={() => setShowArchived(false)}>
          Ativas
        </Button>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onPress={() => setShowArchived(true)}>
          Arquivadas
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : notifications && notifications.length > 0 ? (
        <View className="gap-3">
          {notifications.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] ?? BellIcon;
            return (
              <Card key={notification.id} className="flex-row items-start gap-3">
                <Pressable className="flex-1 flex-row items-start gap-3" onPress={() => openNotification(notification)}>
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Icon size={18} color="#2563EB" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                      {!notification.readAt && <View className="h-2 w-2 rounded-full bg-primary" />}
                      <ThemedText type="smallBold">{notification.title}</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {notification.body}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {timeAgo(notification.createdAt)}
                    </ThemedText>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => (showArchived ? unarchive(notification) : archive(notification))}
                  hitSlop={8}
                  className="p-1 active:opacity-60">
                  <ArchiveIcon size={18} color="#71717a" />
                </Pressable>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card className="items-center py-8">
          <ThemedText type="small" themeColor="textSecondary">
            {showArchived ? 'Nenhuma notificação arquivada.' : 'Nenhuma notificação por aqui.'}
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
