import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  PencilSimpleIcon,
  PlusIcon,
  UsersIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { type WorkspaceSummary, workspaceApi } from '@/lib/workspace-api';

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
  const queryClient = useQueryClient();
  const [editingWorkspace, setEditingWorkspace] =
    useState<WorkspaceSummary | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.listMine,
  });

  const openRename = (workspace: WorkspaceSummary) => {
    setEditingWorkspace(workspace);
    setEditingName(workspace.name);
  };

  const saveRename = async () => {
    if (!editingWorkspace || !editingName.trim()) return;
    setSavingName(true);
    try {
      await workspaceApi.update(editingWorkspace.id, {
        name: editingName.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setEditingWorkspace(null);
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof ApiError
          ? error.message
          : 'Não foi possível renomear o workspace.'
      );
    } finally {
      setSavingName(false);
    }
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
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
            const canManage =
              workspace.role === 'owner' || workspace.role === 'admin';
            return (
              <Card key={workspace.id} className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={() => switchWorkspace(workspace.id)}
                    className="flex-1 flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <ThemedText type="smallBold">
                          {workspace.name}
                        </ThemedText>
                        {isActive && (
                          <CheckCircleIcon
                            size={16}
                            color="#16A34A"
                            weight="fill"
                          />
                        )}
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {TYPE_LABELS[workspace.type] ?? workspace.type} ·{' '}
                        {ROLE_LABELS[workspace.role] ?? workspace.role}
                      </ThemedText>
                    </View>
                  </Pressable>
                  {canManage && (
                    <Pressable
                      onPress={() => openRename(workspace)}
                      hitSlop={8}
                      className="pl-2 active:opacity-60"
                    >
                      <PencilSimpleIcon size={18} color="#71717a" />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  onPress={() =>
                    router.push(`/workspaces/${workspace.id}/members`)
                  }
                  className="flex-row items-center justify-between border-t border-border pt-3"
                >
                  <View className="flex-row items-center gap-2">
                    <UsersIcon size={16} color="#71717a" />
                    <ThemedText type="small" themeColor="textSecondary">
                      Membros
                    </ThemedText>
                  </View>
                  <CaretRightIcon size={14} color="#71717a" />
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push(`/workspaces/${workspace.id}/activity`)
                  }
                  className="flex-row items-center justify-between border-t border-border pt-3"
                >
                  <View className="flex-row items-center gap-2">
                    <ClockCounterClockwiseIcon size={16} color="#71717a" />
                    <ThemedText type="small" themeColor="textSecondary">
                      Atividade
                    </ThemedText>
                  </View>
                  <CaretRightIcon size={14} color="#71717a" />
                </Pressable>
              </Card>
            );
          })}
        </View>
      )}

      <Button
        icon={<PlusIcon size={18} color="#fafafa" />}
        onPress={() => router.push('/workspaces/new')}
      >
        Criar workspace
      </Button>

      <Dialog
        open={!!editingWorkspace}
        onOpenChange={(open) => !open && setEditingWorkspace(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear workspace</DialogTitle>
          </DialogHeader>
          <Input
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Nome do workspace"
          />
          <DialogFooter>
            <Button variant="ghost" onPress={() => setEditingWorkspace(null)}>
              Cancelar
            </Button>
            <Button loading={savingName} onPress={saveRename}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
