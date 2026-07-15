import { SafeAreaView } from 'react-native-safe-area-context';

import { RegisterForm } from '@/components/forms/register-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function RegisterScreen() {
  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1 justify-center gap-4 px-6">
        <ThemedText type="title">Criar conta</ThemedText>
        <RegisterForm />
      </SafeAreaView>
    </ThemedView>
  );
}
