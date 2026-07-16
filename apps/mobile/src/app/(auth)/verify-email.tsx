import { useLocalSearchParams } from 'expo-router';
import { CheckCircleIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { VerifyEmailForm } from '@/components/forms/verify-email-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <Screen center>
      <View className="items-center gap-3 pb-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <CheckCircleIcon size={28} color="#FFFFFF" weight="fill" />
        </View>
        <ThemedText type="subtitle">Verificar e-mail</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Cole o código recebido por e-mail para confirmar sua conta
        </ThemedText>
      </View>
      <VerifyEmailForm defaultToken={token} />
    </Screen>
  );
}
