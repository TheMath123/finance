import { router } from 'expo-router';
import { ArrowLeftIcon, WarningIcon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { DeleteAccountForm } from '@/components/forms/delete-account-form';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';

export default function DeleteAccountScreen() {
  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Excluir conta</ThemedText>
      </View>

      <Card className="gap-3 border-destructive">
        <View className="flex-row items-center gap-2">
          <WarningIcon size={18} color="#DC2626" />
          <ThemedText type="smallBold" style={{ color: '#DC2626' }}>
            Essa ação é irreversível
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Ao excluir sua conta, todas as suas transações, contas, cartões, categorias e faturas
          serão apagados permanentemente e não poderão ser recuperados. Workspaces compartilhados
          em que você não é o único dono continuam existindo para os demais membros.
        </ThemedText>
      </Card>

      <DeleteAccountForm />
    </Screen>
  );
}
