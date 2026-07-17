import { router } from 'expo-router';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  SignOutIcon,
  TrashIcon,
  UserIcon,
  WarningIcon,
  WhatsappLogoIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/auth-api';

export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await authApi.deleteAccount(deletePassword);
      // Conta já foi apagada no backend — só limpa a sessão local; a rota
      // de logout pode falhar silenciosamente (refresh token já não existe).
      await signOut();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Não foi possível excluir a conta.';
      Alert.alert('Erro ao excluir conta', message);
    } finally {
      setDeletingAccount(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Excluir sua conta?',
      'Essa ação é irreversível. Todos os seus dados — transações, contas, cartões, categorias e faturas — serão apagados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir conta', style: 'destructive', onPress: handleDeleteAccount },
      ],
    );
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Perfil</ThemedText>
      </View>

      <Card className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <UserIcon size={22} color="#2563EB" />
        </View>
        <View>
          <ThemedText type="smallBold">{user?.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {user?.email}
          </ThemedText>
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

      <Card className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
          <WhatsappLogoIcon size={18} color="#059669" weight="fill" />
        </View>
        <View className="flex-1">
          <ThemedText type="smallBold">WhatsApp</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {user?.phone ? user.phone : 'Não vinculado'}
          </ThemedText>
        </View>
        <Button variant="ghost" onPress={() => router.push('/whatsapp-link')}>
          {user?.phone ? 'Gerenciar' : 'Vincular'}
        </Button>
      </Card>

      <Button
        variant="destructive"
        icon={<SignOutIcon size={18} color="#fafafa" />}
        loading={signingOut}
        onPress={confirmSignOut}>
        Sair da conta
      </Button>

      <Card className="gap-4 border-destructive">
        <View className="flex-row items-center gap-2">
          <WarningIcon size={18} color="#DC2626" />
          <ThemedText type="smallBold" style={{ color: '#DC2626' }}>
            Zona de perigo
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Excluir sua conta é permanente: transações, contas, cartões, categorias e faturas serão
          apagados e não podem ser recuperados.
        </ThemedText>
        <PasswordInput
          placeholder="Confirme sua senha"
          autoComplete="current-password"
          value={deletePassword}
          onChangeText={setDeletePassword}
        />
        <Button
          variant="destructive"
          icon={<TrashIcon size={18} color="#fafafa" />}
          disabled={deletePassword.length === 0}
          loading={deletingAccount}
          onPress={confirmDeleteAccount}>
          Excluir minha conta
        </Button>
      </Card>
    </Screen>
  );
}
