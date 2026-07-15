import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArchiveIcon, ArrowCounterClockwiseIcon, ArrowLeftIcon, TrashIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { CreateBankForm } from '@/components/forms/create-bank-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { banksApi } from '@/lib/banks-api';

export default function EditBankScreen() {
  const { bankId } = useLocalSearchParams<{ bankId: string }>();
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();

  const { data: banks, isLoading } = useQuery({
    queryKey: ['banks', workspaceId],
    queryFn: () => banksApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const bank = banks?.find((item) => item.id === bankId);

  useEffect(() => {
    if (!isLoading && !bank) router.back();
  }, [isLoading, bank]);

  const invalidateBanks = () => queryClient.invalidateQueries({ queryKey: ['banks', workspaceId] });

  const archiveMutation = useMutation({
    mutationFn: () =>
      bank?.archivedAt
        ? banksApi.unarchive(workspaceId!, bankId!)
        : banksApi.archive(workspaceId!, bankId!),
    onSuccess: invalidateBanks,
    onError: (error) => {
      Alert.alert('Não foi possível', error instanceof ApiError ? error.message : 'Erro inesperado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => banksApi.delete(workspaceId!, bankId!),
    onSuccess: () => {
      invalidateBanks();
      router.back();
    },
    onError: (error) => {
      Alert.alert('Não foi possível excluir', error instanceof ApiError ? error.message : 'Erro inesperado');
    },
  });

  const confirmDelete = () => {
    Alert.alert('Excluir banco', `Deseja excluir "${bank?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
            <ArrowLeftIcon size={22} />
          </Pressable>
          <ThemedText type="subtitle">Editar banco</ThemedText>
        </View>
        {bank && (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70">
              {bank.archivedAt ? (
                <ArrowCounterClockwiseIcon size={16} color="#2563EB" />
              ) : (
                <ArchiveIcon size={16} color="#2563EB" />
              )}
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
              className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70">
              <TrashIcon size={16} color="#DC2626" />
            </Pressable>
          </View>
        )}
      </View>
      {isLoading || !bank ? (
        <ActivityIndicator />
      ) : (
        <CreateBankForm bank={bank} onDone={() => router.back()} />
      )}
    </Screen>
  );
}
