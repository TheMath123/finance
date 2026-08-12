import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { CategoryForm } from '@/components/forms/category-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';

export default function NewCategoryScreen() {
  const { featureFlags } = useSession();

  // Protege contra navegação direta/deep link com a flag desligada.
  useEffect(() => {
    if (featureFlags.custom_category_creation !== true) router.back();
  }, [featureFlags.custom_category_creation]);

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
