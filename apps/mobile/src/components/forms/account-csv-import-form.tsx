import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useSession } from '@/context/session';
import {
  type AccountCsvImportPreviewResult,
  type AccountCsvImportRowStatus,
  accountsApi,
  type ConfirmAccountCsvImportResult,
} from '@/lib/accounts-api';
import { ApiError } from '@/lib/api-client';
import type { Category } from '@/lib/categories-api';
import { formatCents } from '@/lib/money';

const STATUS_LABELS: Record<AccountCsvImportRowStatus, string> = {
  new: 'Nova',
  duplicate: 'Duplicada',
  invalid: 'Inválida',
};

interface AccountCsvReviewRow {
  rowIndex: number;
  date: string;
  description: string;
  amount: number;
  status: AccountCsvImportRowStatus;
  categoryId: string;
  include: boolean;
}

/** Irmão de `CsvImportForm` — mas sem mês/parcela: extrato de conta não tem fatura. */
export function AccountCsvImportForm({
  accountId,
  method,
  categories,
  onDone,
}: {
  accountId: string;
  method: 'pix' | 'debit' | 'cash';
  categories: Category[];
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'select' | 'review' | 'done'>('select');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AccountCsvReviewRow[]>([]);
  const [summary, setSummary] = useState<ConfirmAccountCsvImportResult | null>(
    null
  );

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));
  const includedCount = rows.filter(
    (r) => r.status === 'new' && r.include
  ).length;

  function updateRow(rowIndex: number, patch: Partial<AccountCsvReviewRow>) {
    setRows((current) =>
      current.map((r) => (r.rowIndex === rowIndex ? { ...r, ...patch } : r))
    );
  }

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setFile(result.assets[0] ?? null);
  };

  const preview = useMutation({
    mutationFn: () =>
      accountsApi.previewCsvImport(workspaceId!, accountId, {
        uri: file!.uri,
        name: file!.name,
        type: file!.mimeType ?? 'text/csv',
      }),
    onSuccess: (result: AccountCsvImportPreviewResult) => {
      setRows(
        result.rows.map((r) => ({
          rowIndex: r.rowIndex,
          date: r.date ?? '',
          description: r.description ?? '(descrição vazia)',
          amount: r.amount ?? 0,
          status: r.status,
          categoryId: r.suggestedCategoryId ?? categories[0]?.id ?? '',
          include: r.status === 'new',
        }))
      );
      setStep('review');
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível ler o CSV.'
      );
    },
  });

  const confirm = useMutation({
    mutationFn: () => {
      const payloadRows = rows
        .filter((r) => r.status === 'new' && r.include)
        .map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          categoryId: r.categoryId,
        }));
      return accountsApi.confirmCsvImport(workspaceId!, accountId, {
        method,
        rows: payloadRows,
      });
    },
    onSuccess: (result) => {
      setSummary(result);
      setStep('done');
      queryClient.invalidateQueries({
        queryKey: ['transactions', workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['summary', workspaceId] });
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível confirmar a importação.'
      );
    },
  });

  if (step === 'select') {
    return (
      <View className="gap-4">
        <View className="gap-1">
          <ThemedText type="smallBold">Arquivo CSV</ThemedText>
          <Button variant="outline" onPress={pickFile}>
            {file ? file.name : 'Escolher arquivo'}
          </Button>
          <ThemedText type="small" themeColor="textSecondary">
            Precisa ter data, descrição e valor — positivo é entrada, negativo é
            saída.
          </ThemedText>
        </View>
        {error && (
          <ThemedText type="small" style={{ color: '#DC2626' }}>
            {error}
          </ThemedText>
        )}
        <Button
          loading={preview.isPending}
          disabled={!file}
          onPress={() => {
            setError(null);
            preview.mutate();
          }}
        >
          Analisar CSV
        </Button>
      </View>
    );
  }

  if (step === 'review') {
    return (
      <View className="gap-4">
        <ThemedText type="small" themeColor="textSecondary">
          {includedCount} linha{includedCount === 1 ? '' : 's'} selecionada
          {includedCount === 1 ? '' : 's'} de {rows.length} lida
          {rows.length === 1 ? '' : 's'}.
        </ThemedText>

        <View className="gap-3">
          {rows.map((row) => (
            <View
              key={row.rowIndex}
              className="gap-2 rounded-md border border-input p-3"
            >
              <View className="flex-row items-center justify-between">
                <ThemedText type="small" themeColor="textSecondary">
                  {row.date || '—'}
                </ThemedText>
                <View className="flex-row items-center gap-2">
                  <ThemedText type="smallBold">
                    {formatCents(row.amount)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {STATUS_LABELS[row.status]}
                  </ThemedText>
                </View>
              </View>

              {row.status === 'new' ? (
                <>
                  <View className="flex-row items-center gap-2">
                    <Checkbox
                      checked={row.include}
                      onCheckedChange={(checked) =>
                        updateRow(row.rowIndex, { include: checked })
                      }
                    />
                    <Input
                      className="flex-1"
                      size="sm"
                      value={row.description}
                      editable={row.include}
                      onChangeText={(text) =>
                        updateRow(row.rowIndex, { description: text })
                      }
                    />
                  </View>
                  <Select
                    options={categoryOptions}
                    value={row.categoryId}
                    onValueChange={(value) =>
                      updateRow(row.rowIndex, { categoryId: value })
                    }
                    placeholder="Categoria"
                  />
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {row.description}
                </ThemedText>
              )}
            </View>
          ))}
        </View>

        {error && (
          <ThemedText type="small" style={{ color: '#DC2626' }}>
            {error}
          </ThemedText>
        )}

        <View className="flex-row gap-3">
          <Button
            className="flex-1"
            variant="outline"
            onPress={() => setStep('select')}
          >
            Voltar
          </Button>
          <Button
            className="flex-1"
            loading={confirm.isPending}
            disabled={includedCount === 0}
            onPress={() => {
              setError(null);
              confirm.mutate();
            }}
          >
            {`Importar (${includedCount})`}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <ThemedText>
        {summary?.created ?? 0} transação
        {summary?.created === 1 ? '' : 'ões'} criada
        {summary?.created === 1 ? '' : 's'}.
      </ThemedText>
      {summary && summary.skippedDuplicates > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {summary.skippedDuplicates} pulada
          {summary.skippedDuplicates === 1 ? '' : 's'} por já existir
          (duplicata).
        </ThemedText>
      )}
      <Button onPress={onDone}>Fechar</Button>
    </View>
  );
}
