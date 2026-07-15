import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginForm } from '@/components/forms/login-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  return (
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1 justify-center gap-4 px-6">
        <ThemedText type="title">Entrar</ThemedText>
        <LoginForm />
      </SafeAreaView>
    </ThemedView>
  );
}
