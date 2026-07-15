import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { CreateBankForm } from '@/components/forms/create-bank-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function NewBankScreen() {
  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Novo banco</ThemedText>
      </View>
      <CreateBankForm onDone={() => router.back()} />
    </Screen>
  );
}
