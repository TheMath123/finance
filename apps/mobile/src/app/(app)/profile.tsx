import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  BellRingingIcon,
  CaretRightIcon,
  CircleHalfIcon,
  EnvelopeIcon,
  FingerprintIcon,
  GoogleLogoIcon,
  LockKeyIcon,
  MoonIcon,
  PencilSimpleIcon,
  SignOutIcon,
  SunIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, Switch, View } from 'react-native';

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
import { GoogleAuthButton } from '@/components/ui/google-auth-button';
import { Screen } from '@/components/ui/screen';
import { BrandColors } from '@/constants/theme';
import { useBiometricLock } from '@/context/biometric-lock';
import { useSession } from '@/context/session';
import { useThemePreference } from '@/context/theme-preference';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';
import { googleAuthAvailable } from '@/lib/hooks/use-google-auth';
import type { ThemePreference } from '@/lib/secure-store';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: SunIcon },
  { value: 'dark', label: 'Escuro', icon: MoonIcon },
  { value: 'system', label: 'Automático', icon: CircleHalfIcon },
];

function inferMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export default function ProfileScreen() {
  const { user, signOut, refreshUser } = useSession();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const {
    available: biometricsAvailable,
    enabled: biometricsEnabled,
    setEnabled: setBiometricsEnabled,
  } = useBiometricLock();
  const [signingOut, setSigningOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

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

  const unlinkGoogle = useMutation({
    mutationFn: () => authApi.unlinkGoogle(),
    onSuccess: () => refreshUser(),
    onError: (err) =>
      Alert.alert(
        'Erro',
        err instanceof ApiError
          ? err.message
          : 'Não foi possível desvincular sua conta Google.'
      ),
  });

  const confirmUnlinkGoogle = () => {
    Alert.alert(
      'Desvincular conta Google?',
      'Você continua podendo entrar com e-mail e senha normalmente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () => unlinkGoogle.mutate(),
        },
      ]
    );
  };

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
          <ArrowLeftIcon size={22} color={theme.text} />
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
                <UserIcon size={22} color={BrandColors.primary} />
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
            icon={<PencilSimpleIcon size={18} color={theme.text} />}
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
            <ThemedText type="small" style={{ color: BrandColors.primary }}>
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
              <ThemedText
                type="small"
                style={{ color: BrandColors.destructive }}
              >
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

      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <CircleHalfIcon size={18} color={BrandColors.primary} />
          </View>
          <View className="flex-1">
            <ThemedText type="smallBold">Tema</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Escolha a aparência do app.
            </ThemedText>
          </View>
        </View>
        <View className="flex-row gap-2">
          {THEME_OPTIONS.map((option) => {
            const selected = preference === option.value;
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={selected ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                icon={
                  <Icon
                    size={16}
                    color={selected ? '#FFFFFF' : theme.textSecondary}
                  />
                }
                onPress={() => setPreference(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </View>
      </Card>

      {biometricsAvailable && (
        <Card className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <FingerprintIcon size={18} color={BrandColors.primary} />
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
            trackColor={{ false: '#d4d4d8', true: BrandColors.primary }}
          />
        </Card>
      )}

      {Platform.OS === 'android' && (
        <Pressable
          onPress={() => router.push('/notification-access')}
          className="active:opacity-70"
        >
          <Card className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <BellRingingIcon size={18} color={BrandColors.primary} />
            </View>
            <View className="flex-1">
              <ThemedText type="smallBold">Detecção automática</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Sugerir transações a partir de notificações de banco/cartão.
              </ThemedText>
            </View>
            <CaretRightIcon size={16} color={theme.textSecondary} />
          </Card>
        </Pressable>
      )}

      {(googleAuthAvailable || user?.googleLinked) && (
        <Card className="gap-3">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <GoogleLogoIcon
                size={18}
                color={BrandColors.primary}
                weight="bold"
              />
            </View>
            <View className="flex-1">
              <ThemedText type="smallBold">Conta Google</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {user?.googleLinked
                  ? 'Vinculada — você também pode entrar com Google.'
                  : 'Vincule pra entrar mais rápido, sem digitar senha.'}
              </ThemedText>
            </View>
            {user?.googleLinked ? (
              <Button
                variant="outline"
                size="sm"
                loading={unlinkGoogle.isPending}
                onPress={confirmUnlinkGoogle}
              >
                Desvincular
              </Button>
            ) : (
              <GoogleAuthButton
                label="Vincular"
                size="sm"
                onIdToken={async (idToken) => {
                  setGoogleError(null);
                  await authApi.linkGoogle(idToken);
                  await refreshUser();
                }}
                onError={setGoogleError}
              />
            )}
          </View>
          {googleError && (
            <ThemedText type="small" style={{ color: '#DC2626' }}>
              {googleError}
            </ThemedText>
          )}
        </Card>
      )}

      <Button
        variant="outline"
        icon={<EnvelopeIcon size={18} color={theme.text} />}
        onPress={() => router.push('/change-email')}
      >
        Alterar e-mail
      </Button>

      <Button
        variant="outline"
        icon={<LockKeyIcon size={18} color={theme.text} />}
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
              <XIcon size={20} color={theme.text} />
            </Pressable>
          </DialogHeader>
          <EditNameForm onSuccess={() => setEditingName(false)} />
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
