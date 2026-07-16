import { useLocalSearchParams } from 'expo-router';
import { LockKeyIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { ResetPasswordForm } from '@/components/forms/reset-password-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function ResetPasswordScreen() {
  const { email, code } = useLocalSearchParams<{ email?: string; code?: string }>();

  return (
    <Screen center>
      <View className="items-center gap-3 pb-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <LockKeyIcon size={28} color="#FFFFFF" weight="fill" />
        </View>
        <ThemedText type="subtitle">Redefinir senha</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Confirme seu e-mail e informe o código de 6 dígitos recebido
        </ThemedText>
      </View>
      <ResetPasswordForm defaultEmail={email} defaultCode={code} />
    </Screen>
  );
}
