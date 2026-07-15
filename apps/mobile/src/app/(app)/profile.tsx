import { router } from 'expo-router';
import { ArrowLeftIcon, SignOutIcon, UserIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';

export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

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

      <Button
        variant="destructive"
        icon={<SignOutIcon size={18} color="#fafafa" />}
        loading={signingOut}
        onPress={confirmSignOut}>
        Sair da conta
      </Button>
    </Screen>
  );
}
