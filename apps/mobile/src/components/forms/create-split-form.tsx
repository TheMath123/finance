import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { splitApi, type CreateSplitParticipant } from '@/lib/split-api';
import type { Transaction } from '@/lib/transactions-api';

interface ParticipantRow {
  key: string;
  type: 'user' | 'external';
  value: string;
  amount: string;
}

function newRow(type: ParticipantRow['type']): ParticipantRow {
  return { key: crypto.randomUUID(), type, value: '', amount: '' };
}

export function CreateSplitForm({ transaction, onDone }: { transaction: Transaction; onDone: () => void }) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const [equal, setEqual] = useState(true);
  const [rows, setRows] = useState<ParticipantRow[]>([newRow('user')]);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (key: string, patch: Partial<ParticipantRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const mutation = useMutation({
    mutationFn: () => {
      const participants: CreateSplitParticipant[] = rows.map((r) => ({
        type: r.type,
        ...(r.type === 'user' ? { contact: r.value.trim() } : { name: r.value.trim() }),
        ...(equal ? {} : { amount: Math.round(Number(r.amount.replace(',', '.')) * 100) }),
      }));
      return splitApi.create(workspaceId!, transaction.id, participants);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splits-owed-to-me'] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Erro inesperado'),
  });

  return (
    <View className="gap-4">
      <ThemedText type="small" themeColor="textSecondary">
        Dividindo &quot;{transaction.description}&quot;
      </ThemedText>

      <View className="gap-4">
        {rows.map((row) => (
          <View key={row.key} className="gap-2">
            <View className="flex-row items-center justify-between">
              <ThemedText type="small">
                {row.type === 'user' ? 'Usuário da plataforma' : 'Participante externo'}
              </ThemedText>
              {rows.length > 1 && (
                <Pressable onPress={() => removeRow(row.key)} hitSlop={8} className="active:opacity-60">
                  <TrashIcon size={16} color="#DC2626" />
                </Pressable>
              )}
            </View>
            <Input
              placeholder={row.type === 'user' ? 'Telefone ou e-mail' : 'Nome'}
              value={row.value}
              onChangeText={(v) => updateRow(row.key, { value: v })}
              autoCapitalize="none"
            />
            {!equal && (
              <Input
                placeholder="Valor (R$)"
                keyboardType="decimal-pad"
                value={row.amount}
                onChangeText={(v) => updateRow(row.key, { amount: v })}
              />
            )}
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          variant="outline"
          size="sm"
          icon={<PlusIcon size={14} />}
          onPress={() => setRows((prev) => [...prev, newRow('user')])}>
          Usuário
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          size="sm"
          icon={<PlusIcon size={14} />}
          onPress={() => setRows((prev) => [...prev, newRow('external')])}>
          Externo
        </Button>
      </View>

      <Pressable onPress={() => setEqual((v) => !v)} className="flex-row items-center gap-2">
        <Checkbox checked={equal} onCheckedChange={setEqual} />
        <ThemedText type="small">Dividir igualmente entre todos (você incluído)</ThemedText>
      </Pressable>

      {error && (
        <ThemedText type="small" style={{ color: '#DC2626' }}>
          {error}
        </ThemedText>
      )}

      <Button loading={mutation.isPending} onPress={() => mutation.mutate()}>
        Dividir despesa
      </Button>
    </View>
  );
}
