import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { CreateAccountForm } from '@/components/forms/create-account-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';

export default function EditAccountScreen() {
  const theme = useTheme();
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const account = accounts?.find((item) => item.id === accountId);

  useEffect(() => {
    if (!isLoading && !account) router.back();
  }, [isLoading, account]);

  const invalidateAccounts = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
  };

  const archiveMutation = useMutation({
    mutationFn: () =>
      account?.archivedAt
        ? accountsApi.unarchive(workspaceId!, accountId!)
        : accountsApi.archive(workspaceId!, accountId!),
    onSuccess: invalidateAccounts,
    onError: (error) => {
      Alert.alert(
        'Não foi possível',
        error instanceof ApiError ? error.message : 'Erro inesperado'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => accountsApi.delete(workspaceId!, accountId!),
    onSuccess: () => {
      invalidateAccounts();
      router.back();
    },
    onError: (error) => {
      Alert.alert(
        'Não foi possível excluir',
        error instanceof ApiError ? error.message : 'Erro inesperado'
      );
    },
  });

  const confirmDelete = () => {
    Alert.alert('Excluir conta', `Deseja excluir "${account?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="active:opacity-60"
          >
            <ArrowLeftIcon size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle">Editar conta</ThemedText>
        </View>
        {account && (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70"
            >
              {account.archivedAt ? (
                <ArrowCounterClockwiseIcon
                  size={16}
                  color={BrandColors.primary}
                />
              ) : (
                <ArchiveIcon size={16} color={BrandColors.primary} />
              )}
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
              className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70"
            >
              <TrashIcon size={16} color="#DC2626" />
            </Pressable>
          </View>
        )}
      </View>
      {isLoading || !account ? (
        <ActivityIndicator />
      ) : (
        <CreateAccountForm account={account} onDone={() => router.back()} />
      )}
    </Screen>
  );
}
