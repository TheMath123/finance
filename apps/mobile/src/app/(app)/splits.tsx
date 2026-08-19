import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { formatCents } from '@/lib/money';
import {
  type OwedByMeShare,
  type OwedToMeShare,
  splitApi,
} from '@/lib/split-api';

function MutationError({ error }: { error: unknown }) {
  return (
    <ThemedText type="small" style={{ color: '#DC2626' }}>
      {error instanceof ApiError
        ? error.message
        : 'Erro inesperado, tenta de novo.'}
    </ThemedText>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago, aguardando confirmação',
  confirmed: 'Confirmado',
};

function OwedByMeCard({ share }: { share: OwedByMeShare }) {
  const queryClient = useQueryClient();
  const markPaid = useMutation({
    mutationFn: () => splitApi.markPaid(share.shareId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['splits-owed-by-me'] }),
  });

  return (
    <Card className="gap-2">
      <ThemedText type="smallBold">{share.transactionDescription}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Você deve pra {share.creatorName}
      </ThemedText>
      <View className="flex-row items-center justify-between">
        <ThemedText type="subtitle">{formatCents(share.amount)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {STATUS_LABELS[share.status] ?? share.status}
        </ThemedText>
      </View>
      {share.status === 'pending' && (
        <Button loading={markPaid.isPending} onPress={() => markPaid.mutate()}>
          Marcar como pago
        </Button>
      )}
      {markPaid.isError && <MutationError error={markPaid.error} />}
    </Card>
  );
}

function OwedToMeCard({ share }: { share: OwedToMeShare }) {
  const queryClient = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => splitApi.confirm(share.shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits-owed-to-me'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });

  // Participante com conta (participantUserId) precisa ter marcado "paguei" antes —
  // criador só confirma nesse ponto (ver requiredStatus em confirm-reimbursement.ts).
  // Externo (sem conta) pula direto de "pending" pra confirmado.
  const canConfirm =
    share.status === (share.participantUserId ? 'paid' : 'pending');

  return (
    <Card className="gap-2">
      <ThemedText type="smallBold">{share.transactionDescription}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {share.participantName} te deve
      </ThemedText>
      <View className="flex-row items-center justify-between">
        <ThemedText type="subtitle">{formatCents(share.amount)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {STATUS_LABELS[share.status] ?? share.status}
        </ThemedText>
      </View>
      {canConfirm ? (
        <Button loading={confirm.isPending} onPress={() => confirm.mutate()}>
          Confirmar recebimento
        </Button>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Aguardando {share.participantName} marcar como pago.
        </ThemedText>
      )}
      {confirm.isError && <MutationError error={confirm.error} />}
    </Card>
  );
}

export default function SplitsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<'owed-by-me' | 'owed-to-me'>('owed-by-me');

  const { data: owedByMe, isLoading: loadingOwedByMe } = useQuery({
    queryKey: ['splits-owed-by-me'],
    queryFn: splitApi.listOwedByMe,
  });
  const { data: owedToMe, isLoading: loadingOwedToMe } = useQuery({
    queryKey: ['splits-owed-to-me'],
    queryFn: splitApi.listOwedToMe,
  });

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:opacity-60"
        >
          <ArrowLeftIcon size={22} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Splits pendentes</ThemedText>
      </View>

      <View className="flex-row gap-2">
        <Button
          variant={tab === 'owed-by-me' ? 'default' : 'outline'}
          size="sm"
          onPress={() => setTab('owed-by-me')}
        >
          O que eu devo
        </Button>
        <Button
          variant={tab === 'owed-to-me' ? 'default' : 'outline'}
          size="sm"
          onPress={() => setTab('owed-to-me')}
        >
          O que me devem
        </Button>
      </View>

      {tab === 'owed-by-me' ? (
        loadingOwedByMe ? (
          <ActivityIndicator />
        ) : owedByMe && owedByMe.length > 0 ? (
          <View className="gap-3">
            {owedByMe.map((share) => (
              <OwedByMeCard key={share.shareId} share={share} />
            ))}
          </View>
        ) : (
          <Card className="items-center py-8">
            <ThemedText type="small" themeColor="textSecondary">
              Você não deve nada no momento.
            </ThemedText>
          </Card>
        )
      ) : loadingOwedToMe ? (
        <ActivityIndicator />
      ) : owedToMe && owedToMe.length > 0 ? (
        <View className="gap-3">
          {owedToMe.map((share) => (
            <OwedToMeCard key={share.shareId} share={share} />
          ))}
        </View>
      ) : (
        <Card className="items-center py-8">
          <ThemedText type="small" themeColor="textSecondary">
            Ninguém te deve nada no momento.
          </ThemedText>
        </Card>
      )}
    </Screen>
  );
}
