import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { CategoryForm } from '@/components/forms/category-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function NewCategoryScreen() {
  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Nova categoria</ThemedText>
      </View>
      <CategoryForm onDone={() => router.back()} />
    </Screen>
  );
}
