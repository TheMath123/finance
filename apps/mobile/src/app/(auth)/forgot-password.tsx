import { EnvelopeIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { ForgotPasswordForm } from '@/components/forms/forgot-password-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function ForgotPasswordScreen() {
  return (
    <Screen center>
      <View className="items-center gap-3 pb-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <EnvelopeIcon size={28} color="#FFFFFF" weight="fill" />
        </View>
        <ThemedText type="subtitle">Esqueci minha senha</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Informe seu e-mail para receber o link de redefinição
        </ThemedText>
      </View>
      <ForgotPasswordForm />
    </Screen>
  );
}
