import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon, TrashIcon } from 'phosphor-react-native';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { transferApi } from '@/lib/transfer-api';

export default function TrustedContactsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['trusted-contacts'],
    queryFn: transferApi.listTrustedContacts,
  });

  const remove = useMutation({
    mutationFn: (id: string) => transferApi.removeTrustedContact(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['trusted-contacts'] }),
    onError: (error) =>
      Alert.alert(
        'Erro',
        error instanceof ApiError ? error.message : 'Não foi possível remover.'
      ),
  });

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
        <ThemedText type="subtitle">Contatos confiáveis</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Transferências de contatos confiáveis entram direto na conta escolhida,
        sem precisar aceitar uma por uma.
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator />
      ) : contacts && contacts.length > 0 ? (
        <View className="gap-3">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="flex-row items-center justify-between"
            >
              <ThemedText type="smallBold">
                {contact.trustedUserName}
              </ThemedText>
              <Pressable
                onPress={() => remove.mutate(contact.id)}
                hitSlop={8}
                className="p-1 active:opacity-60"
              >
                <TrashIcon size={18} color="#DC2626" />
              </Pressable>
            </Card>
          ))}
        </View>
      ) : (
        <Card className="items-center py-6">
          <ThemedText type="small" themeColor="textSecondary">
            Nenhum contato confiável ainda.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
