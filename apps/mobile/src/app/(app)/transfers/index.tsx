import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Screen } from '@/components/ui/screen';
import { Select, type SelectOption } from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';
import { formatCents } from '@/lib/money';
import { transferApi, type PendingTransfer } from '@/lib/transfer-api';

function MutationError({ error }: { error: unknown }) {
  return (
    <ThemedText type="small" style={{ color: '#DC2626' }}>
      {error instanceof ApiError ? error.message : 'Erro inesperado, tenta de novo.'}
    </ThemedText>
  );
}

function timeLeft(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? 'expira hoje' : `expira em ${days}d`;
}

function PendingTransferCard({
  transfer,
  accountOptions,
}: {
  transfer: PendingTransfer;
  accountOptions: SelectOption[];
}) {
  const [accountId, setAccountId] = useState('');
  const [markTrusted, setMarkTrusted] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transfers-pending'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  };

  const accept = useMutation({
    mutationFn: () => transferApi.accept(transfer.id, { accountId, markTrusted }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => transferApi.reject(transfer.id),
    onSuccess: invalidate,
  });

  return (
    <Card className="gap-3">
      <View>
        <ThemedText type="smallBold">{transfer.fromUserName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {transfer.description}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {timeLeft(transfer.expiresAt)}
        </ThemedText>
      </View>
      <ThemedText type="subtitle">{formatCents(transfer.amount)}</ThemedText>
      <Select
        placeholder="Receber em qual conta?"
        options={accountOptions}
        value={accountId}
        onValueChange={setAccountId}
      />
      <Pressable onPress={() => setMarkTrusted((v) => !v)} className="flex-row items-center gap-2">
        <Checkbox checked={markTrusted} onCheckedChange={setMarkTrusted} />
        <ThemedText type="small">Confiar em quem enviou — próximas entram automático</ThemedText>
      </Pressable>
      <View className="flex-row gap-2">
        <Button className="flex-1" variant="outline" loading={reject.isPending} onPress={() => reject.mutate()}>
          Recusar
        </Button>
        <Button
          className="flex-1"
          disabled={!accountId}
          loading={accept.isPending}
          onPress={() => accept.mutate()}>
          Aceitar
        </Button>
      </View>
      {(accept.isError || reject.isError) && <MutationError error={accept.error ?? reject.error} />}
    </Card>
  );
}

export default function PendingTransfersScreen() {
  const { data: pending, isLoading } = useQuery({
    queryKey: ['transfers-pending'],
    queryFn: transferApi.listPending,
  });
  const { data: accounts } = useQuery({
    queryKey: ['transfer-accounts'],
    queryFn: transferApi.listAccounts,
  });

  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({
    label: `${a.accountName} · ${a.workspaceName}`,
    value: a.accountId,
  }));

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} hitSlop={8} className="active:opacity-60">
          <ArrowLeftIcon size={22} />
        </Pressable>
        <ThemedText type="subtitle">Transferências pendentes</ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : pending && pending.length > 0 ? (
        <View className="gap-3">
          {pending.map((transfer) => (
            <PendingTransferCard key={transfer.id} transfer={transfer} accountOptions={accountOptions} />
          ))}
        </View>
      ) : (
        <Card className="items-center py-8">
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma transferência pendente.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
