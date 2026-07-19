import { useQuery } from '@tanstack/react-query';
import { getBank } from '@finance/shared';
import { router } from 'expo-router';
import {
  CaretRightIcon,
  ChartLineUpIcon,
  CreditCardIcon,
  EnvelopeSimpleIcon,
  HandCoinsIcon,
  HandshakeIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  WhatsappLogoIcon,
} from 'phosphor-react-native';
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
import { transferApi } from '@/lib/transfer-api';
import { workspaceApi } from '@/lib/workspace-api';

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
  const { data: myInvites } = useQuery({
    queryKey: ['my-invites'],
    queryFn: workspaceApi.listMyInvites,
  });
  const { data: pendingTransfers } = useQuery({
    queryKey: ['transfers-pending'],
    queryFn: transferApi.listPending,
  });

  const bankName = (bankCode: string) => getBank(bankCode)?.name ?? bankCode;

  return (
    <Screen className="gap-6 pb-28">
      <ThemedText type="subtitle">Mais</ThemedText>

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
          icon={<ChartLineUpIcon size={18} color="#2563EB" />}
          label="Gasto variável"
          onPress={() => router.push('/variable-expense')}
        />
        <NavRow
          icon={<UsersIcon size={18} color="#2563EB" />}
          label="Workspaces"
          onPress={() => router.push('/workspaces')}
        />
        {myInvites && myInvites.length > 0 && (
          <NavRow
            icon={<EnvelopeSimpleIcon size={18} color="#2563EB" />}
            label="Convites recebidos"
            count={myInvites.length}
            onPress={() => router.push('/invites')}
          />
        )}
        <NavRow
          icon={<PaperPlaneTiltIcon size={18} color="#2563EB" />}
          label="Enviar transferência"
          onPress={() => router.push('/transfers/new')}
        />
        {pendingTransfers && pendingTransfers.length > 0 && (
          <NavRow
            icon={<HandCoinsIcon size={18} color="#2563EB" />}
            label="Transferências pendentes"
            count={pendingTransfers.length}
            onPress={() => router.push('/transfers')}
          />
        )}
        <NavRow
          icon={<HandshakeIcon size={18} color="#2563EB" />}
          label="Contatos confiáveis"
          onPress={() => router.push('/trusted-contacts')}
        />
        <NavRow
          icon={<WhatsappLogoIcon size={18} color="#2563EB" />}
          label="WhatsApp"
          onPress={() => router.push('/whatsapp-link')}
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
