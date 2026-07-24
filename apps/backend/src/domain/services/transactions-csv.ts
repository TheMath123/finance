import type {
  TransactionMethod,
  TransactionSource,
  TransactionType,
} from '@finance/shared';

export interface TransactionExportRow {
  date: string;
  description: string;
  /** Centavos. */
  amount: number;
  type: TransactionType;
  method: TransactionMethod;
  categoryName: string;
  accountName: string | null;
  /** Conta de destino — só preenchida em transferências (method=transfer). */
  toAccountName: string | null;
  cardName: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  source: TransactionSource;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

const METHOD_LABELS: Record<TransactionMethod, string> = {
  pix: 'Pix',
  debit: 'Débito',
  cash: 'Dinheiro',
  credit: 'Crédito',
  transfer: 'Transferência',
};

const SOURCE_LABELS: Record<TransactionSource, string> = {
  app: 'App',
  chatbot: 'WhatsApp',
};

const HEADER = [
  'Data',
  'Descrição',
  'Valor',
  'Tipo',
  'Método',
  'Categoria',
  'Conta',
  'Conta destino',
  'Cartão',
  'Parcela',
  'Origem',
];

/** Escapa um campo pro formato CSV (RFC 4180): aspas ao redor se tiver vírgula, aspas ou quebra de linha. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(csvField).join(',');
}

/**
 * M2-11: export CSV de transações (portabilidade LGPD) — um CSV consolidado,
 * com nomes já resolvidos (categoria/conta/cartão) em vez de IDs crus, pra
 * ser lido diretamente em planilha sem precisar cruzar com outras tabelas.
 */
export function buildTransactionsCsv(rows: TransactionExportRow[]): string {
  const lines = [csvRow(HEADER)];
  for (const row of rows) {
    const installment =
      row.installmentNumber && row.installmentTotal
        ? `${row.installmentNumber}/${row.installmentTotal}`
        : '';
    lines.push(
      csvRow([
        row.date,
        row.description,
        (row.amount / 100).toFixed(2),
        TYPE_LABELS[row.type],
        METHOD_LABELS[row.method],
        row.categoryName,
        row.accountName ?? '',
        row.toAccountName ?? '',
        row.cardName ?? '',
        installment,
        SOURCE_LABELS[row.source],
      ])
    );
  }
  return lines.join('\r\n');
}
