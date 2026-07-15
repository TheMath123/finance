import { WalletIcon } from 'phosphor-react-native';
import { View } from 'react-native';

import { RegisterForm } from '@/components/forms/register-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function RegisterScreen() {
  return (
    <Screen center>
      <View className="items-center gap-3 pb-4">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <WalletIcon size={28} color="#FFFFFF" weight="fill" />
        </View>
        <ThemedText type="subtitle">Criar conta</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Leva menos de um minuto
        </ThemedText>
      </View>
      <RegisterForm />
    </Screen>
  );
}
