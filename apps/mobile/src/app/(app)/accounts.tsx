import { useQuery } from '@tanstack/react-query';
import { BankIcon, PlusIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { CreateAccountForm } from '@/components/forms/create-account-form';
import { CreateBankForm } from '@/components/forms/create-bank-form';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { banksApi } from '@/lib/banks-api';
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
  const [dialog, setDialog] = useState<'bank' | 'account' | null>(null);

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

  const bankName = (bankId: string) => banks?.find((b) => b.id === bankId)?.name ?? '—';

  return (
    <Screen className="gap-6 pb-28">
      <ThemedText type="subtitle">Contas</ThemedText>

      <View className="gap-3">
        <SectionHeader title="Bancos" onAdd={() => setDialog('bank')} />
        {loadingBanks ? (
          <ActivityIndicator />
        ) : banks && banks.length > 0 ? (
          banks.map((bank) => (
            <Card key={bank.id} className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <BankIcon size={18} color="#2563EB" />
              </View>
              <ThemedText type="smallBold">{bank.name}</ThemedText>
            </Card>
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
        <SectionHeader title="Contas" onAdd={() => setDialog('account')} />
        {loadingAccounts ? (
          <ActivityIndicator />
        ) : accounts && accounts.length > 0 ? (
          accounts.map((account) => (
            <Card key={account.id} className="flex-row items-center justify-between">
              <View>
                <ThemedText type="smallBold">{account.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {bankName(account.bankId)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{formatCents(account.balance)}</ThemedText>
            </Card>
          ))
        ) : (
          <Card className="items-center py-6">
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma conta cadastrada ainda.
            </ThemedText>
          </Card>
        )}
      </View>

      <Dialog open={dialog === 'bank'} onOpenChange={(open) => setDialog(open ? 'bank' : null)}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo banco</DialogTitle>
          </DialogHeader>
          <CreateBankForm onDone={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'account'} onOpenChange={(open) => setDialog(open ? 'account' : null)}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
          </DialogHeader>
          <CreateAccountForm banks={banks ?? []} onDone={() => setDialog(null)} />
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
