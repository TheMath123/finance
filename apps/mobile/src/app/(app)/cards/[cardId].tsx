import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { CreateCardForm } from '@/components/forms/create-card-form';
import { PayInvoiceForm } from '@/components/forms/pay-invoice-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/context/session';
import { accountsApi } from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import { cardsApi, type Invoice } from '@/lib/cards-api';
import { formatCents } from '@/lib/money';

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const STATUS_LABELS: Record<Invoice['effectiveStatus'], string> = {
  open: 'Aberta',
  closed: 'Fechada',
  paid: 'Paga',
};

export default function CardDetailScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const { data: cards } = useQuery({
    queryKey: ['cards', workspaceId],
    queryFn: () => cardsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', workspaceId, cardId],
    queryFn: () => cardsApi.listInvoices(workspaceId!, cardId!),
    enabled: Boolean(workspaceId && cardId),
  });
  const { data: accounts } = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => accountsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const cardItem = cards?.find((item) => item.id === cardId);

  const archiveMutation = useMutation({
    mutationFn: () =>
      cardItem?.archivedAt
        ? cardsApi.unarchive(workspaceId!, cardId!)
        : cardsApi.archive(workspaceId!, cardId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', workspaceId] });
    },
    onError: (error) => {
      Alert.alert('Não foi possível', error instanceof ApiError ? error.message : 'Erro inesperado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => cardsApi.delete(workspaceId!, cardId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', workspaceId] });
      router.back();
    },
    onError: (error) => {
      Alert.alert('Não foi possível excluir', error instanceof ApiError ? error.message : 'Erro inesperado');
    },
  });

  const confirmDelete = () => {
    Alert.alert('Excluir cartão', `Deseja excluir "${cardItem?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  };

  return (
    <Screen className="gap-6 pb-28">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:opacity-70">
            <ArrowLeftIcon size={18} color="#2563EB" />
          </Pressable>
          <ThemedText type="subtitle">{cardItem?.name ?? 'Cartão'}</ThemedText>
        </View>
        {cardItem && (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setEditing((value) => !value)}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70">
              <PencilIcon size={16} color="#2563EB" />
            </Pressable>
            <Pressable
              onPress={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 active:opacity-70">
              {cardItem.archivedAt ? (
                <ArrowCounterClockwiseIcon size={16} color="#2563EB" />
              ) : (
                <ArchiveIcon size={16} color="#2563EB" />
              )}
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
              className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10 active:opacity-70">
              <TrashIcon size={16} color="#DC2626" />
            </Pressable>
          </View>
        )}
      </View>

      {editing && cardItem && (
        <View className="gap-2">
          <ThemedText type="smallBold">Editar cartão</ThemedText>
          <CreateCardForm card={cardItem} onDone={() => setEditing(false)} />
        </View>
      )}

      <View className="gap-3">
        <ThemedText type="smallBold">Faturas</ThemedText>
        {loadingInvoices ? (
          <ActivityIndicator />
        ) : invoices && invoices.length > 0 ? (
          invoices.map((invoice) => (
            <Card key={invoice.id} className="gap-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <ThemedText type="smallBold">
                    {MONTH_LABELS[invoice.monthReference - 1]}/{invoice.yearReference}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {STATUS_LABELS[invoice.effectiveStatus]}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{formatCents(invoice.total)}</ThemedText>
              </View>
              {invoice.effectiveStatus !== 'paid' && (
                <Button variant="outline" size="sm" onPress={() => setPayingInvoiceId(invoice.id)}>
                  Pagar
                </Button>
              )}
            </Card>
          ))
        ) : (
          <Card className="items-center py-6">
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma fatura encontrada.
            </ThemedText>
          </Card>
        )}
      </View>

      <Dialog open={payingInvoiceId !== null} onOpenChange={(open) => !open && setPayingInvoiceId(null)}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagar fatura</DialogTitle>
          </DialogHeader>
          {payingInvoiceId && (
            <PayInvoiceForm
              invoiceId={payingInvoiceId}
              accounts={accounts ?? []}
              onDone={() => setPayingInvoiceId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
