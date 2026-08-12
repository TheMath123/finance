import type { TransactionType } from '@finance/shared';
import { type Either, left, right } from '@finance/shared';
import {
  decodeCsvBuffer,
  detectColumnMapping,
  detectDelimiter,
  detectInstallment,
  MAX_CSV_IMPORT_SIZE_BYTES,
  parseAmountCents,
  parseCsvRows,
  parseDate,
} from '../../../domain/services/csv-import';
import { normalizeDescription } from '../../../domain/services/occurrence-rules';
import type { Actor, UseCaseDeps } from '../../deps';
import type { AccountError } from './errors';

export { MAX_CSV_IMPORT_SIZE_BYTES };

export interface PreviewAccountCsvImportInput {
  accountId: string;
  buffer: Uint8Array;
}

export type CsvImportRowStatus = 'new' | 'duplicate' | 'invalid';

export interface AccountCsvImportPreviewRow {
  /** Posição entre as linhas de dado (após descartar cabeçalho, se houver) — usado pra ecoar de volta no confirm. */
  rowIndex: number;
  raw: string[];
  date: string | null;
  /** Já sem sufixo "NN/NN" de parcela, se detectado (irrelevante pra conta, mas evita colar o número na descrição). */
  description: string | null;
  /** Centavos, com sinal — extrato: positivo = entrada, negativo = saída. */
  amount: number | null;
  type: TransactionType | null;
  status: CsvImportRowStatus;
  suggestedCategoryId: string | null;
}

export interface PreviewAccountCsvImportOutput {
  delimiter: string;
  /** false = não achou cabeçalho reconhecível, todas as linhas foram tratadas como dado (avisar na UI). */
  headerDetected: boolean;
  rows: AccountCsvImportPreviewRow[];
}

/**
 * Leitura pura: decodifica, detecta formato, parseia cada linha, classifica
 * contra o que já existe na conta no intervalo de datas do próprio arquivo
 * (dedup) e sugere categoria — nunca grava nada (ver `confirmAccountCsvImport`).
 *
 * Sem fatura/parcela: ao contrário do import de cartão, não há um mês alvo
 * escolhido — o intervalo de dedup é o min/max das datas encontradas no CSV.
 */
export async function previewAccountCsvImport(
  deps: Pick<UseCaseDeps, 'repos'>,
  actor: Actor,
  input: PreviewAccountCsvImportInput
): Promise<Either<AccountError, PreviewAccountCsvImportOutput>> {
  const account = await deps.repos.account.findActiveInWorkspace(
    actor.workspaceId,
    input.accountId
  );
  if (!account) return left('account_not_found');
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

  // Parse de cada linha primeiro (sem classificar) pra descobrir o intervalo
  // de datas real do arquivo — só então dá pra buscar o que já existe pra dedup.
  interface ParsedRow {
    rowIndex: number;
    raw: string[];
    date: string | null;
    description: string | null;
    amount: number | null;
  }
  const parsed: ParsedRow[] = dataRows.map((raw, i) => {
    const dateRaw = raw[mapping.dateCol];
    const descriptionRaw = raw[mapping.descriptionCol];
    const amountRaw = raw[mapping.valueCol];
    return {
      rowIndex: i,
      raw,
      date: dateRaw !== undefined ? parseDate(dateRaw) : null,
      description: descriptionRaw?.trim() || null,
      amount: amountRaw !== undefined ? parseAmountCents(amountRaw) : null,
    };
  });

  const validDates = parsed
    .map((r) => r.date)
    .filter((d): d is string => d !== null);
  const existing =
    validDates.length > 0
      ? await deps.repos.transaction.listByAccountAndPeriod(
          input.accountId,
          validDates.reduce((min, d) => (d < min ? d : min)),
          validDates.reduce((max, d) => (d > max ? d : max))
        )
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

  const rows: AccountCsvImportPreviewRow[] = [];
  for (const row of parsed) {
    if (row.date === null || row.description === null || row.amount === null) {
      rows.push({
        rowIndex: row.rowIndex,
        raw: row.raw,
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: null,
        status: 'invalid',
        suggestedCategoryId: null,
      });
      continue;
    }

    const installmentMatch = detectInstallment(row.description);
    const description = installmentMatch
      ? installmentMatch.cleanDescription
      : row.description;
    const descriptionNormalized = normalizeDescription(description);
    // Extrato de conta: convenção invertida da fatura de cartão — positivo é
    // entrada (crédito), negativo é saída (débito).
    const type: TransactionType = row.amount < 0 ? 'expense' : 'income';
    const absoluteAmount = Math.abs(row.amount);

    const isDuplicate = existing.some(
      (t) =>
        t.date === row.date &&
        t.descriptionNormalized === descriptionNormalized &&
        t.amount === absoluteAmount
    );

    rows.push({
      rowIndex: row.rowIndex,
      raw: row.raw,
      date: row.date,
      description,
      amount: row.amount,
      type,
      status: isDuplicate ? 'duplicate' : 'new',
      suggestedCategoryId: await suggestCategory(descriptionNormalized),
    });
  }

  return right({ delimiter, headerDetected: mapping.headerDetected, rows });
}
