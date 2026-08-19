import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { CreateTransferForm } from '@/components/forms/create-transfer-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

export default function NewTransferScreen() {
  const theme = useTheme();
  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Enviar transferência</ThemedText>
      </View>
      <CreateTransferForm onDone={() => router.back()} />
    </Screen>
  );
}
