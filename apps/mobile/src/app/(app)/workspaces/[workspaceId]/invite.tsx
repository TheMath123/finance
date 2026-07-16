import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Alert, Pressable, View } from 'react-native';

import { CreateInviteForm } from '@/components/forms/create-invite-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ApiError } from '@/lib/api-client';
import { workspaceApi } from '@/lib/workspace-api';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', member: 'Membro', viewer: 'Somente leitura' };

export default function InviteToWorkspaceScreen() {
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();

  const { data: invites } = useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: () => workspaceApi.listWorkspaceInvites(workspaceId),
  });

  const revoke = async (inviteId: string) => {
    try {
      await workspaceApi.revokeInvite(inviteId);
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
    } catch (error) {
      Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível revogar o convite.');
    }
  };

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Convidar</ThemedText>
      </View>

      <CreateInviteForm workspaceId={workspaceId} onDone={() => router.back()} />

      {invites && invites.length > 0 && (
        <View className="gap-3">
          <ThemedText type="smallBold">Convites pendentes</ThemedText>
          {invites.map((invite) => (
            <Card key={invite.id} className="flex-row items-center justify-between">
              <View className="flex-1">
                <ThemedText type="smallBold">{invite.emailOrPhone}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {ROLE_LABELS[invite.role] ?? invite.role}
                </ThemedText>
              </View>
              <Button variant="ghost" textClassName="text-destructive" onPress={() => revoke(invite.id)}>
                Revogar
              </Button>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
