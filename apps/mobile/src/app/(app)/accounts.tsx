import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BankIcon, CaretRightIcon, CreditCardIcon, TagIcon, PlusIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { banksApi } from '@/lib/banks-api';
import { categoriesApi } from '@/lib/categories-api';
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

function NavRow({
  icon,
  label,
  count,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">{icon}</View>
          <ThemedText type="smallBold">{label}</ThemedText>
        </View>
        <View className="flex-row items-center gap-2">
          <ThemedText type="small" themeColor="textSecondary">
            {count}
          </ThemedText>
          <CaretRightIcon size={16} color="#71717a" />
        </View>
      </Card>
    </Pressable>
  );
}

export default function AccountsScreen() {
  const { workspaceId } = useSession();

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
  const { data: cards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => categoriesApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

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
        <ThemedText type="smallBold">Mais</ThemedText>
        <NavRow
          icon={<CreditCardIcon size={18} color="#2563EB" />}
          label="Cartões"
          count={cards?.length ?? 0}
          onPress={() => router.push('/cards')}
        />
        <NavRow
          icon={<TagIcon size={18} color="#2563EB" />}
          label="Categorias"
          count={categories?.length ?? 0}
          onPress={() => router.push('/categories')}
        />
      </View>
    </Screen>
  );
}
