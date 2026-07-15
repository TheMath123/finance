import { WalletIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { LoginForm } from '@/components/forms/login-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function LoginScreen() {
  return (
    <Screen center>
      <View className="items-center gap-3 pb-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <WalletIcon size={28} color="#FFFFFF" weight="fill" />
        </View>
        <ThemedText type="subtitle">Bem-vindo de volta</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Entre para ver o resumo das suas finanças
        </ThemedText>
      </View>
      <LoginForm />
    </Screen>
  );
}
