import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BankIcon, CreditCardIcon, PencilIcon, PlusIcon, TrashIcon } from 'phosphor-react-native';
import { Alert, ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { banksApi } from '@/lib/banks-api';
import { categoriesApi, type Category } from '@/lib/categories-api';
import { cardsApi } from '@/lib/cards-api';
import { cn } from '@/lib/cn';
import { formatCents } from '@/lib/money';

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <ThemedText type="smallBold">{title}</ThemedText>
      <Pressable
        onPress={onAdd}
        className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70">
        <PlusIcon size={16} color="#2563EB" weight="bold" />
      </Pressable>
    </View>
  );
}

export default function AccountsScreen() {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();

  const { data: banks, isLoading: loadingBanks } = useQuery({
    queryKey: ['banks', workspaceId],
    queryFn: () => banksApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const { data: cards, isLoading: loadingCards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => categoriesApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) => categoriesApi.delete(workspaceId!, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', workspaceId] });
    },
    onError: (error) => {
      Alert.alert('Não foi possível excluir', error instanceof ApiError ? error.message : 'Erro inesperado');
    },
  });

  const confirmDeleteCategory = (category: Category) => {
    Alert.alert('Excluir categoria', `Deseja excluir "${category.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteCategory.mutate(category.id) },
    ]);
  };

  const bankName = (bankId: string) => banks?.find((b) => b.id === bankId)?.name ?? '—';

  return (
    <Screen className="gap-6 pb-28">
      <ThemedText type="subtitle">Contas</ThemedText>

      <View className="gap-3">
        <SectionHeader title="Bancos" onAdd={() => router.push('/banks/new')} />
        {loadingBanks ? (
          <ActivityIndicator />
        ) : banks && banks.length > 0 ? (
          banks.map((bank) => (
            <Pressable key={bank.id} onPress={() => router.push(`/banks/${bank.id}`)}>
              <Card className={cn('flex-row items-center gap-3', bank.archivedAt && 'opacity-50')}>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <BankIcon size={18} color="#2563EB" />
                </View>
                <ThemedText type="smallBold">{bank.name}</ThemedText>
                {bank.archivedAt && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Arquivado
                  </ThemedText>
                )}
              </Card>
            </Pressable>
          ))
        ) : (
          <Card className="items-center py-6">
            <ThemedText type="small" themeColor="textSecondary">
              Nenhum banco cadastrado ainda.
            </ThemedText>
          </Card>
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Contas" onAdd={() => router.push('/accounts/new')} />
        {loadingAccounts ? (
          <ActivityIndicator />
        ) : accounts && accounts.length > 0 ? (
          accounts.map((account) => (
            <Pressable key={account.id} onPress={() => router.push(`/accounts/${account.id}`)}>
              <Card
                className={cn('flex-row items-center justify-between', account.archivedAt && 'opacity-50')}>
                <View>
                  <View className="flex-row items-center gap-2">
                    <ThemedText type="smallBold">{account.name}</ThemedText>
                    {account.archivedAt && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Arquivado
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {bankName(account.bankId)}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{formatCents(account.balance)}</ThemedText>
              </Card>
            </Pressable>
          ))
        ) : (
          <Card className="items-center py-6">
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma conta cadastrada ainda.
            </ThemedText>
          </Card>
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Cartões" onAdd={() => router.push('/cards/new')} />
        {loadingCards ? (
          <ActivityIndicator />
        ) : cards && cards.length > 0 ? (
          cards.map((cardItem) => (
            <Pressable key={cardItem.id} onPress={() => router.push(`/cards/${cardItem.id}`)}>
              <Card
                className={cn(
                  'flex-row items-center justify-between',
                  cardItem.archivedAt && 'opacity-50',
                )}>
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <CreditCardIcon size={18} color="#2563EB" />
                  </View>
                  <View>
                    <View className="flex-row items-center gap-2">
                      <ThemedText type="smallBold">{cardItem.name}</ThemedText>
                      {cardItem.archivedAt && (
                        <ThemedText type="small" themeColor="textSecondary">
                          Arquivado
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {bankName(cardItem.bankId)}
                    </ThemedText>
                  </View>
                </View>
                <View className="items-end">
                  <ThemedText type="small" themeColor="textSecondary">
                    Disponível
                  </ThemedText>
                  <ThemedText type="smallBold">{formatCents(cardItem.availableLimit)}</ThemedText>
                </View>
              </Card>
            </Pressable>
          ))
        ) : (
          <Card className="items-center py-6">
            <ThemedText type="small" themeColor="textSecondary">
              Nenhum cartão cadastrado ainda.
            </ThemedText>
          </Card>
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Categorias" onAdd={() => router.push('/categories/new')} />
        {loadingCategories ? (
          <ActivityIndicator />
        ) : categories && categories.length > 0 ? (
          categories.map((category) =>
            category.isDefault ? (
              <Card key={category.id} className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <ThemedText type="smallBold">{category.name}</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Padrão
                </ThemedText>
              </Card>
            ) : (
              <Card key={category.id} className="flex-row items-center justify-between">
                <Pressable
                  className="flex-1 flex-row items-center gap-3"
                  onPress={() => router.push(`/categories/${category.id}`)}>
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <ThemedText type="smallBold">{category.name}</ThemedText>
                </Pressable>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => router.push(`/categories/${category.id}`)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70">
                    <PencilIcon size={16} color="#2563EB" />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeleteCategory(category)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70">
                    <TrashIcon size={16} color="#DC2626" />
                  </Pressable>
                </View>
              </Card>
            ),
          )
        ) : (
          <Card className="items-center py-6">
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma categoria cadastrada ainda.
            </ThemedText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
