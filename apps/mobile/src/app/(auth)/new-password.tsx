import { Redirect, useLocalSearchParams } from 'expo-router';
import { LockKeyIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { NewPasswordForm } from '@/components/forms/new-password-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function NewPasswordScreen() {
  const { email, code } = useLocalSearchParams<{
    email?: string;
    code?: string;
  }>();

  // Chegou direto (sem passar pelo passo do código) — manda de volta pro início do fluxo.
  if (!email || !code) {
    return <Redirect href="/reset-password" />;
  }

  return (
    <Screen center>
      <View className="items-center gap-3 pb-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <LockKeyIcon size={28} color="#FFFFFF" weight="fill" />
        </View>
        <ThemedText type="subtitle">Nova senha</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Escolha e confirme a sua nova senha
        </ThemedText>
      </View>
      <NewPasswordForm email={email} code={code} />
    </Screen>
  );
}
