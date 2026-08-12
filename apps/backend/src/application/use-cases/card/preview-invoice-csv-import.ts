import type { TransactionType } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import {
  decodeCsvBuffer,
  detectColumnMapping,
  detectDelimiter,
  detectInstallment,
  parseAmountCents,
  parseCsvRows,
  parseDate,
} from '../../../domain/services/csv-import';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { CardError } from './errors';

/** CSV de fatura é texto puro — 2MB cobre milhares de linhas com folga. */
export const MAX_CSV_IMPORT_SIZE_BYTES = 2 * 1024 * 1024;

export interface PreviewInvoiceCsvImportInput {
  cardId: string;
  month: number;
  year: number;
  buffer: Uint8Array;
}

export type CsvImportRowStatus = 'new' | 'duplicate' | 'invalid';

export interface CsvImportRowInstallment {
  number: number;
  total: number;
}

export interface CsvImportPreviewRow {
  /** Posição entre as linhas de dado (após descartar cabeçalho, se houver) — usado pra ecoar de volta no confirm. */
  rowIndex: number;
  raw: string[];
  date: string | null;
  /** Já sem o sufixo "NN/NN" quando parcela é detectada. */
  description: string | null;
  /** Centavos, com sinal (negativo = estorno/reembolso). */
  amount: number | null;
  type: TransactionType | null;
  status: CsvImportRowStatus;
  installment: CsvImportRowInstallment | null;
  suggestedCategoryId: string | null;
}

export interface PreviewInvoiceCsvImportOutput {
  delimiter: string;
  /** false = não achou cabeçalho reconhecível, todas as linhas foram tratadas como dado (avisar na UI). */
  headerDetected: boolean;
  rows: CsvImportPreviewRow[];
}

/**
 * Leitura pura: decodifica, detecta formato, parseia cada linha, classifica
 * contra o que já existe na fatura alvo (dedup) e sugere parcela/categoria —
 * nunca grava nada (ver `confirmInvoiceCsvImport`).
 */
export async function previewInvoiceCsvImport(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: Actor,
  input: PreviewInvoiceCsvImportInput
): Promise<Either<CardError, PreviewInvoiceCsvImportOutput>> {
  const card = await deps.repos.card.findActiveInWorkspace(
    actor.workspaceId,
    input.cardId
  );
  if (!card) return left('card_not_found');
  if (input.buffer.byteLength > MAX_CSV_IMPORT_SIZE_BYTES) {
    return left('file_too_large');
  }

  const text = decodeCsvBuffer(input.buffer);
  const delimiter = detectDelimiter(text);
  const allRows = parseCsvRows(text, delimiter);
  if (allRows.length === 0) return left('csv_empty');

  const mapping = detectColumnMapping(allRows[0]!);
  const dataRows = mapping.headerDetected ? allRows.slice(1) : allRows;
  if (dataRows.length === 0) return left('csv_empty');

  const targetInvoice = await deps.repos.invoice.findByCardAndPeriod(
    input.cardId,
    { month: input.month, year: input.year }
  );
  const existing = targetInvoice
    ? await deps.repos.transaction.listByInvoice(targetInvoice.id)
    : [];

  const fallbackCategory = await deps.repos.category.findFallback(
    actor.workspaceId
  );

  const categorySuggestionCache = new Map<string, string | null>();
  async function suggestCategory(
    descriptionNormalized: string
  ): Promise<string | null> {
    const cached = categorySuggestionCache.get(descriptionNormalized);
    if (cached !== undefined) return cached;
    const suggestion =
      (await deps.repos.transaction.findMostUsedCategory(
        actor.workspaceId,
        descriptionNormalized
      )) ??
      fallbackCategory?.id ??
      null;
    categorySuggestionCache.set(descriptionNormalized, suggestion);
    return suggestion;
  }

  const rows: CsvImportPreviewRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i]!;
    const dateRaw = raw[mapping.dateCol];
    const descriptionRaw = raw[mapping.descriptionCol];
    const amountRaw = raw[mapping.valueCol];

    const date = dateRaw !== undefined ? parseDate(dateRaw) : null;
    const descriptionTrimmed = descriptionRaw?.trim() || null;
    const amount = amountRaw !== undefined ? parseAmountCents(amountRaw) : null;

    if (date === null || descriptionTrimmed === null || amount === null) {
      rows.push({
        rowIndex: i,
        raw,
        date,
        description: descriptionTrimmed,
        amount,
        type: null,
        status: 'invalid',
        installment: null,
        suggestedCategoryId: null,
      });
      continue;
    }

    const installmentMatch = detectInstallment(descriptionTrimmed);
    const description = installmentMatch
      ? installmentMatch.cleanDescription
      : descriptionTrimmed;
    const descriptionNormalized = normalizeDescription(description);
    const type: TransactionType = amount < 0 ? 'income' : 'expense';
    const absoluteAmount = Math.abs(amount);

    const isDuplicate = existing.some(
      (t) =>
        t.date === date &&
        t.descriptionNormalized === descriptionNormalized &&
        t.amount === absoluteAmount
    );

    rows.push({
      rowIndex: i,
      raw,
      date,
      description,
      amount,
      type,
      status: isDuplicate ? 'duplicate' : 'new',
      installment: installmentMatch
        ? { number: installmentMatch.number, total: installmentMatch.total }
        : null,
      suggestedCategoryId: await suggestCategory(descriptionNormalized),
    });
  }

  return right({ delimiter, headerDetected: mapping.headerDetected, rows });
}
