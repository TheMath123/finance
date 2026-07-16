import { useQuery } from '@tanstack/react-query';
import { getBank } from '@finance/shared';
import { router } from 'expo-router';
import { CaretRightIcon, CreditCardIcon, PlusIcon, TagIcon, UserIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { cardsApi } from '@/lib/cards-api';
import { categoriesApi } from '@/lib/categories-api';
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
  icon: ReactNode;
  label: string;
  count?: number;
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
          {count !== undefined && (
            <ThemedText type="small" themeColor="textSecondary">
              {count}
            </ThemedText>
          )}
          <CaretRightIcon size={16} color="#71717a" />
        </View>
      </Card>
    </Pressable>
  );
}

export default function AccountsScreen() {
  const { workspaceId } = useSession();

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

  const bankName = (bankCode: string) => getBank(bankCode)?.name ?? bankCode;

  return (
    <Screen className="gap-6 pb-28">
      <ThemedText type="subtitle">Contas</ThemedText>

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
                    {bankName(account.bankCode)}
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
        <NavRow
          icon={<UserIcon size={18} color="#2563EB" />}
          label="Perfil"
          onPress={() => router.push('/profile')}
        />
      </View>
    </Screen>
  );
}
