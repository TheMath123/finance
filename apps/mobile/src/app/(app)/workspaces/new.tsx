import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { CreateWorkspaceForm } from '@/components/forms/create-workspace-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';

export default function NewWorkspaceScreen() {
  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Novo workspace</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Crie um workspace pra compartilhar as finanças com família ou outras pessoas.
      </ThemedText>
      <CreateWorkspaceForm onDone={() => router.replace('/workspaces')} />
    </Screen>
  );
}
