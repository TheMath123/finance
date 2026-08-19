import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { ChangeEmailForm } from '@/components/forms/change-email-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

export default function ChangeEmailScreen() {
  const theme = useTheme();
  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Alterar e-mail</ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Trocar o e-mail exige confirmar um código enviado para o endereço novo.
      </ThemedText>

      <ChangeEmailForm />
    </Screen>
  );
}
