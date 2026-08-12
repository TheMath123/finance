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
import { ApiError } from '@/lib/api-client';
import {
  type ConfirmCsvImportResult,
  type CsvImportPreviewResult,
  type CsvImportRowStatus,
  cardsApi,
} from '@/lib/cards-api';
import type { Category } from '@/lib/categories-api';
import { formatCents } from '@/lib/money';

const MONTH_OPTIONS = [
  { label: 'Janeiro', value: '1' },
  { label: 'Fevereiro', value: '2' },
  { label: 'Março', value: '3' },
  { label: 'Abril', value: '4' },
  { label: 'Maio', value: '5' },
  { label: 'Junho', value: '6' },
  { label: 'Julho', value: '7' },
  { label: 'Agosto', value: '8' },
  { label: 'Setembro', value: '9' },
  { label: 'Outubro', value: '10' },
  { label: 'Novembro', value: '11' },
  { label: 'Dezembro', value: '12' },
];

const STATUS_LABELS: Record<CsvImportRowStatus, string> = {
  new: 'Nova',
  duplicate: 'Duplicada',
  invalid: 'Inválida',
};

interface CsvReviewRow {
  rowIndex: number;
  date: string;
  description: string;
  amount: number;
  status: CsvImportRowStatus;
  installmentDetected: { number: number; total: number } | null;
  treatAsInstallment: boolean;
  categoryId: string;
  include: boolean;
}

export function CsvImportForm({
  cardId,
  categories,
  onDone,
}: {
  cardId: string;
  categories: Category[];
  onDone: () => void;
}) {
  const { workspaceId } = useSession();
  const queryClient = useQueryClient();
  const now = new Date();

  const [step, setStep] = useState<'select' | 'review' | 'done'>('select');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null
  );
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvReviewRow[]>([]);
  const [summary, setSummary] = useState<ConfirmCsvImportResult | null>(null);

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));
  const includedCount = rows.filter(
    (r) => r.status === 'new' && r.include
  ).length;

  function updateRow(rowIndex: number, patch: Partial<CsvReviewRow>) {
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
      cardsApi.previewCsvImport(
        workspaceId!,
        cardId,
        {
          uri: file!.uri,
          name: file!.name,
          type: file!.mimeType ?? 'text/csv',
        },
        Number(month),
        Number(year)
      ),
    onSuccess: (result: CsvImportPreviewResult) => {
      setRows(
        result.rows.map((r) => ({
          rowIndex: r.rowIndex,
          date: r.date ?? '',
          description: r.description ?? '(descrição vazia)',
          amount: r.amount ?? 0,
          status: r.status,
          installmentDetected: r.installment,
          treatAsInstallment: r.installment !== null,
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
          installment:
            r.treatAsInstallment && r.installmentDetected
              ? r.installmentDetected
              : null,
        }));
      return cardsApi.confirmCsvImport(workspaceId!, cardId, {
        month: Number(month),
        year: Number(year),
        rows: payloadRows,
      });
    },
    onSuccess: (result) => {
      setSummary(result);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['invoices', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['cards', workspaceId] });
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
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1">
            <ThemedText type="smallBold">Mês</ThemedText>
            <Select
              options={MONTH_OPTIONS}
              value={month}
              onValueChange={setMonth}
              placeholder="Mês"
            />
          </View>
          <View className="w-24 gap-1">
            <ThemedText type="smallBold">Ano</ThemedText>
            <Input
              keyboardType="number-pad"
              value={year}
              onChangeText={setYear}
              maxLength={4}
            />
          </View>
        </View>
        <View className="gap-1">
          <ThemedText type="smallBold">Arquivo CSV</ThemedText>
          <Button variant="outline" onPress={pickFile}>
            {file ? file.name : 'Escolher arquivo'}
          </Button>
          <ThemedText type="small" themeColor="textSecondary">
            Precisa ter data, descrição e valor — o formato do banco é detectado
            automaticamente.
          </ThemedText>
        </View>
        {error && (
          <ThemedText type="small" style={{ color: '#DC2626' }}>
            {error}
          </ThemedText>
        )}
        <Button
          loading={preview.isPending}
          disabled={!file || !month || !year}
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
                  {row.installmentDetected && (
                    <View className="flex-row items-center gap-2 pl-9">
                      <Checkbox
                        checked={row.treatAsInstallment}
                        disabled={!row.include}
                        onCheckedChange={(checked) =>
                          updateRow(row.rowIndex, {
                            treatAsInstallment: checked,
                          })
                        }
                      />
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        className="flex-1"
                      >
                        Parcela {row.installmentDetected.number} de{' '}
                        {row.installmentDetected.total} — lança as próximas
                        faturas
                      </ThemedText>
                    </View>
                  )}
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
      {summary && summary.skippedPaidInvoice > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {summary.skippedPaidInvoice} parcela
          {summary.skippedPaidInvoice === 1 ? '' : 's'} futura
          {summary.skippedPaidInvoice === 1 ? '' : 's'} não lançada
          {summary.skippedPaidInvoice === 1 ? '' : 's'} — fatura já paga.
        </ThemedText>
      )}
      <Button onPress={onDone}>Fechar</Button>
    </View>
  );
}
