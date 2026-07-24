import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { ChangePasswordForm } from '@/components/forms/change-password-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function ChangePasswordScreen() {
  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Alterar senha</ThemedText>
      </View>

      <ChangePasswordForm />
    </Screen>
  );
}
