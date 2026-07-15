import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { CreateCardForm } from '@/components/forms/create-card-form';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { banksApi } from '@/lib/banks-api';

export default function NewCardScreen() {
  const { workspaceId } = useSession();
  const { data: banks } = useQuery({
    queryKey: ['banks', workspaceId],
    queryFn: () => banksApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  return (
    <Screen className="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Novo cartão</ThemedText>
      </View>
      <CreateCardForm banks={banks ?? []} onDone={() => router.back()} />
    </Screen>
  );
}
