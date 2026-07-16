import type { WorkspaceRole } from '@finance/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { workspaceApi, type WorkspaceMemberView } from '@/lib/workspace-api';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Somente leitura',
};

const ROLE_OPTIONS = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Membro', value: 'member' },
  { label: 'Somente leitura', value: 'viewer' },
];

export default function WorkspaceMembersScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [editingMember, setEditingMember] = useState<WorkspaceMemberView | null>(null);
  const [pendingRole, setPendingRole] = useState<string | undefined>();
  const [savingRole, setSavingRole] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => workspaceApi.listMembers(workspaceId),
  });

  const myRole = members?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });

  const openRoleEditor = (member: WorkspaceMemberView) => {
    setEditingMember(member);
    setPendingRole(member.role);
  };

  const saveRole = async () => {
    if (!editingMember || !pendingRole) return;
    setSavingRole(true);
    try {
      await workspaceApi.updateMemberRole(workspaceId, editingMember.userId, pendingRole as WorkspaceRole);
      setEditingMember(null);
      refresh();
    } catch (error) {
      Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível mudar o papel.');
    } finally {
      setSavingRole(false);
    }
  };

  const removeMember = async (member: WorkspaceMemberView) => {
    const isSelf = member.userId === user?.id;
    setRemovingUserId(member.userId);
    try {
      await workspaceApi.removeMember(workspaceId, member.userId);
      refresh();
      if (isSelf) {
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        router.replace('/workspaces');
      }
    } catch (error) {
      Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível remover o membro.');
    } finally {
      setRemovingUserId(null);
    }
  };

  const confirmRemove = (member: WorkspaceMemberView) => {
    const isSelf = member.userId === user?.id;
    Alert.alert(
      isSelf ? 'Sair do workspace?' : `Remover ${member.name}?`,
      isSelf ? 'Você perde acesso aos dados deste workspace.' : undefined,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: isSelf ? 'Sair' : 'Remover', style: 'destructive', onPress: () => removeMember(member) },
      ],
    );
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Membros</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <View className="gap-3">
          {members?.map((member) => (
            <Card key={member.userId} className="flex-row items-center justify-between">
              <Pressable
                className="flex-1"
                disabled={!canManage || member.role === 'owner'}
                onPress={() => openRoleEditor(member)}>
                <ThemedText type="smallBold">{member.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {member.email} · {ROLE_LABELS[member.role] ?? member.role}
                </ThemedText>
              </Pressable>
              {(canManage || member.userId === user?.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  icon={<TrashIcon size={18} color="#DC2626" />}
                  loading={removingUserId === member.userId}
                  onPress={() => confirmRemove(member)}
                />
              )}
            </Card>
          ))}
        </View>
      )}

      {canManage && (
        <Button
          icon={<PlusIcon size={18} color="#fafafa" />}
          onPress={() => router.push(`/workspaces/${workspaceId}/invite`)}>
          Convidar
        </Button>
      )}

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar papel de {editingMember?.name}</DialogTitle>
          </DialogHeader>
          <Select
            options={myRole === 'owner' ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => o.value !== 'owner')}
            value={pendingRole}
            onValueChange={setPendingRole}
            placeholder="Selecione o papel"
          />
          <DialogFooter>
            <Button variant="ghost" onPress={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button loading={savingRole} onPress={saveRole}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
