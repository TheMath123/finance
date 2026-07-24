import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  TrashIcon,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { type AuditLogView, workspaceApi } from '@/lib/workspace-api';

const ENTITY_LABELS: Record<string, string> = {
  workspace: 'workspace',
  workspace_member: 'membro',
  workspace_invite: 'convite',
  bank_account: 'conta',
  bank: 'banco',
  card: 'cartão',
  card_invoice: 'fatura',
  category: 'categoria',
  transaction: 'transação',
  recurring_transaction: 'recorrência',
};

const ACTION_LABELS: Record<AuditLogView['action'], string> = {
  create: 'criou',
  update: 'editou',
  delete: 'excluiu',
  restore: 'restaurou',
};

const ACTION_ICONS: Record<
  AuditLogView['action'],
  ComponentType<{ size?: number; color?: string }>
> = {
  create: PlusCircleIcon,
  update: PencilSimpleIcon,
  delete: TrashIcon,
  restore: ArrowCounterClockwiseIcon,
};

function ActivityRow({ entry }: { entry: AuditLogView }) {
  const Icon = ACTION_ICONS[entry.action];
  const who = entry.userName ?? 'Usuário removido';
  const what = ENTITY_LABELS[entry.entity] ?? entry.entity;
  const when = new Date(entry.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
        <Icon size={18} color="#2563EB" />
      </View>
      <View className="flex-1">
        <ThemedText type="smallBold">
          {who} {ACTION_LABELS[entry.action]} um(a) {what}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {when}
        </ThemedText>
      </View>
    </Card>
  );
}

export default function WorkspaceActivityScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();

  const { data: activity, isLoading } = useQuery({
    queryKey: ['workspace-activity', workspaceId],
    queryFn: () => workspaceApi.listActivity(workspaceId),
  });

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Atividade</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : activity && activity.length > 0 ? (
        <View className="gap-3">
          {activity.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : (
        <Card className="items-center py-6">
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma atividade registrada ainda.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
