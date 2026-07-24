import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { attachmentApi } from '@/lib/attachment-api';
import type { Transaction } from '@/lib/transactions-api';

function inferMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export function AttachmentField({
  workspaceId,
  transaction,
}: {
  workspaceId: string;
  transaction: Transaction;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  // Espelha o attachmentKey localmente: quem abre esse form (ex. explore.tsx)
  // guarda a transação num useState congelado no momento em que o modal abriu,
  // então invalidar a query da lista não atualiza esse prop — sem isso, a
  // prévia só aparecia depois de fechar e reabrir o modal.
  const [attachmentKey, setAttachmentKey] = useState(transaction.attachmentKey);
  useEffect(() => {
    setAttachmentKey(transaction.attachmentKey);
  }, [transaction.attachmentKey]);
  const hasAttachment = Boolean(attachmentKey);

  const { data: preview } = useQuery({
    queryKey: ['attachment-url', transaction.id],
    queryFn: () => attachmentApi.getUrl(workspaceId, transaction.id),
    enabled: hasAttachment,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ['attachment-url', transaction.id],
    });
    queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
  };

  const upload = useMutation({
    mutationFn: (asset: ImagePicker.ImagePickerAsset) =>
      attachmentApi.upload(workspaceId, transaction.id, {
        uri: asset.uri,
        name:
          asset.fileName ??
          `comprovante.${(asset.mimeType ?? 'image/jpeg').split('/')[1]}`,
        type: asset.mimeType ?? inferMimeType(asset.uri),
      }),
    onSuccess: (result) => {
      setAttachmentKey(result.attachmentKey);
      invalidate();
      setEditing(false);
    },
    onError: (err) => {
      if (!(err instanceof ApiError)) console.error('[attachment upload]', err);
      Alert.alert(
        'Erro',
        err instanceof ApiError
          ? err.message
          : 'Não foi possível anexar o comprovante.'
      );
    },
  });

  const remove = useMutation({
    mutationFn: () => attachmentApi.delete(workspaceId, transaction.id),
    onSuccess: () => {
      setAttachmentKey(null);
      invalidate();
    },
    onError: (err) =>
      Alert.alert(
        'Erro',
        err instanceof ApiError
          ? err.message
          : 'Não foi possível remover o comprovante.'
      ),
  });

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos acessar sua galeria pra anexar o comprovante.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) upload.mutate(result.assets[0]!);
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos acessar sua câmera pra fotografar o comprovante.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) upload.mutate(result.assets[0]!);
  };

  return (
    <View className="gap-2">
      <ThemedText type="smallBold">Comprovante</ThemedText>
      {hasAttachment && preview?.url && (
        <Image
          source={{ uri: preview.url }}
          className="h-40 w-full rounded-md"
          resizeMode="cover"
        />
      )}
      {hasAttachment && !editing ? (
        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            size="sm"
            onPress={() => setEditing(true)}
          >
            Editar
          </Button>
          <Pressable
            onPress={() => remove.mutate()}
            hitSlop={8}
            className="items-center justify-center px-2 active:opacity-60"
          >
            <ThemedText type="small" style={{ color: '#DC2626' }}>
              Remover
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            size="sm"
            loading={upload.isPending}
            onPress={pickFromCamera}
          >
            Câmera
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            size="sm"
            loading={upload.isPending}
            onPress={pickFromLibrary}
          >
            Galeria
          </Button>
          {hasAttachment && (
            <Pressable
              onPress={() => setEditing(false)}
              hitSlop={8}
              className="items-center justify-center px-2 active:opacity-60"
            >
              <ThemedText type="small" themeColor="textSecondary">
                Cancelar
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
