import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon, CaretRightIcon, CheckCircleIcon, PlusIcon, UsersIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { workspaceApi } from '@/lib/workspace-api';

const TYPE_LABELS: Record<string, string> = {
  personal: 'Pessoal',
  family: 'Família',
  business: 'Empresa',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Somente leitura',
};

export default function WorkspacesScreen() {
  const { workspaceId, switchWorkspace } = useSession();

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.listMine,
  });

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Workspaces</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <View className="gap-3">
          {workspaces?.map((workspace) => {
            const isActive = workspace.id === workspaceId;
            return (
              <Card key={workspace.id} className="gap-3">
                <Pressable
                  onPress={() => switchWorkspace(workspace.id)}
                  className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <ThemedText type="smallBold">{workspace.name}</ThemedText>
                      {isActive && <CheckCircleIcon size={16} color="#16A34A" weight="fill" />}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {TYPE_LABELS[workspace.type] ?? workspace.type} · {ROLE_LABELS[workspace.role] ?? workspace.role}
                    </ThemedText>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/workspaces/${workspace.id}/members`)}
                  className="flex-row items-center justify-between border-t border-border pt-3">
                  <View className="flex-row items-center gap-2">
                    <UsersIcon size={16} color="#71717a" />
                    <ThemedText type="small" themeColor="textSecondary">
                      Membros
                    </ThemedText>
                  </View>
                  <CaretRightIcon size={14} color="#71717a" />
                </Pressable>
              </Card>
            );
          })}
        </View>
      )}

      <Pressable onPress={() => router.push('/invites')}>
        <Card className="flex-row items-center justify-between">
          <ThemedText type="smallBold">Convites recebidos</ThemedText>
          <CaretRightIcon size={16} color="#71717a" />
        </Card>
      </Pressable>

      <Button icon={<PlusIcon size={18} color="#fafafa" />} onPress={() => router.push('/workspaces/new')}>
        Criar workspace
      </Button>
    </Screen>
  );
}
