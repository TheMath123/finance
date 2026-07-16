import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { workspaceApi } from '@/lib/workspace-api';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', member: 'Membro', viewer: 'Somente leitura' };

export default function MyInvitesScreen() {
  const queryClient = useQueryClient();
  const { switchWorkspace } = useSession();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data: invites, isLoading } = useQuery({
    queryKey: ['my-invites'],
    queryFn: workspaceApi.listMyInvites,
  });

  const accept = async (inviteId: string, workspaceId: string) => {
    setAcceptingId(inviteId);
    try {
      await workspaceApi.acceptInvite(inviteId);
      queryClient.invalidateQueries({ queryKey: ['my-invites'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      await switchWorkspace(workspaceId);
      router.replace('/workspaces');
    } catch (error) {
      Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível aceitar o convite.');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Convites recebidos</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : invites && invites.length > 0 ? (
        <View className="gap-3">
          {invites.map((invite) => (
            <Card key={invite.id} className="gap-3">
              <View>
                <ThemedText type="smallBold">{invite.workspaceName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {invite.inviterName} te convidou como {ROLE_LABELS[invite.role] ?? invite.role}
                </ThemedText>
              </View>
              <Button loading={acceptingId === invite.id} onPress={() => accept(invite.id, invite.workspaceId)}>
                Aceitar
              </Button>
            </Card>
          ))}
        </View>
      ) : (
        <Card className="items-center py-6">
          <ThemedText type="small" themeColor="textSecondary">
            Nenhum convite pendente.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
