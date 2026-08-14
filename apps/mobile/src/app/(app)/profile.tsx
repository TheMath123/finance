import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  FingerprintIcon,
  LockKeyIcon,
  PencilSimpleIcon,
  SignOutIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, Switch, View } from 'react-native';

import { EditNameForm } from '@/components/forms/edit-name-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { useBiometricLock } from '@/context/biometric-lock';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';

function inferMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export default function ProfileScreen() {
  const { user, signOut, refreshUser } = useSession();
  const {
    available: biometricsAvailable,
    enabled: biometricsEnabled,
    setEnabled: setBiometricsEnabled,
  } = useBiometricLock();
  const [signingOut, setSigningOut] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const uploadAvatar = useMutation({
    mutationFn: (asset: ImagePicker.ImagePickerAsset) =>
      authApi.uploadAvatar({
        uri: asset.uri,
        name:
          asset.fileName ??
          `avatar.${(asset.mimeType ?? 'image/jpeg').split('/')[1]}`,
        type: asset.mimeType ?? inferMimeType(asset.uri),
      }),
    onSuccess: () => refreshUser(),
    onError: (err) => {
      if (!(err instanceof ApiError)) console.error('[avatar upload]', err);
      Alert.alert(
        'Erro',
        err instanceof ApiError
          ? err.message
          : 'Não foi possível atualizar a foto.'
      );
    },
  });

  const removeAvatar = useMutation({
    mutationFn: () => authApi.removeAvatar(),
    onSuccess: () => refreshUser(),
    onError: (err) =>
      Alert.alert(
        'Erro',
        err instanceof ApiError
          ? err.message
          : 'Não foi possível remover a foto.'
      ),
  });

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos acessar sua galeria pra atualizar a foto.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) uploadAvatar.mutate(result.assets[0]!);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sair da conta?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: handleSignOut },
    ]);
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
        <ThemedText type="subtitle">Perfil</ThemedText>
      </View>

      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={pickAvatar}
            disabled={uploadAvatar.isPending}
            className="active:opacity-70"
          >
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UserIcon size={22} color="#2563EB" />
              </View>
            )}
          </Pressable>
          <View className="flex-1">
            <ThemedText type="smallBold">{user?.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user?.email}
            </ThemedText>
          </View>
          <Button
            variant="ghost"
            icon={<PencilSimpleIcon size={18} />}
            onPress={() => setEditingName(true)}
          >
            Editar
          </Button>
        </View>
        <View className="flex-row gap-3">
          <Pressable
            onPress={pickAvatar}
            disabled={uploadAvatar.isPending}
            hitSlop={8}
            className="active:opacity-60"
          >
            <ThemedText type="small" style={{ color: '#2563EB' }}>
              {uploadAvatar.isPending ? 'Enviando…' : 'Alterar foto'}
            </ThemedText>
          </Pressable>
          {user?.avatarUrl && (
            <Pressable
              onPress={() => removeAvatar.mutate()}
              disabled={removeAvatar.isPending}
              hitSlop={8}
              className="active:opacity-60"
            >
              <ThemedText type="small" style={{ color: '#DC2626' }}>
                Remover foto
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Card>

      {!user?.emailVerifiedAt && (
        <Card className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
            <EnvelopeIcon size={18} color="#B45309" />
          </View>
          <View className="flex-1">
            <ThemedText type="smallBold">E-mail não verificado</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Verifique seu e-mail para poder recuperar sua senha depois.
            </ThemedText>
          </View>
          <Button variant="ghost" onPress={() => router.push('/verify-email')}>
            Verificar
          </Button>
        </Card>
      )}

      {biometricsAvailable && (
        <Card className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <FingerprintIcon size={18} color="#2563EB" />
          </View>
          <View className="flex-1">
            <ThemedText type="smallBold">Travar com biometria</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Pede biometria ao abrir o app ou voltar do segundo plano.
            </ThemedText>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: '#d4d4d8', true: '#2563EB' }}
          />
        </Card>
      )}

      <Button
        variant="outline"
        icon={<EnvelopeIcon size={18} />}
        onPress={() => router.push('/change-email')}
      >
        Alterar e-mail
      </Button>

      <Button
        variant="outline"
        icon={<LockKeyIcon size={18} />}
        onPress={() => router.push('/change-password')}
      >
        Alterar senha
      </Button>

      <Button
        variant="outline"
        className="border-destructive"
        textClassName="text-destructive"
        icon={<TrashIcon size={18} color="#DC2626" />}
        onPress={() => router.push('/delete-account')}
      >
        Excluir conta
      </Button>

      <Button
        variant="destructive"
        icon={<SignOutIcon size={18} color="#fafafa" />}
        loading={signingOut}
        onPress={confirmSignOut}
      >
        Sair da conta
      </Button>

      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={{ textAlign: 'center' }}
      >
        Versão {Constants.expoConfig?.version}
      </ThemedText>

      <Dialog open={editingName} onOpenChange={setEditingName}>
        <DialogContent>
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle>Editar nome</DialogTitle>
            <Pressable
              onPress={() => setEditingName(false)}
              hitSlop={8}
              className="active:opacity-60"
            >
              <XIcon size={20} />
            </Pressable>
          </DialogHeader>
          <EditNameForm onSuccess={() => setEditingName(false)} />
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
