/**
 * Regras puras de import de CSV de fatura de cartão (domain — sem I/O, sem
 * dependência de biblioteca de parsing — mesmo estilo hand-rolled de
 * `transactions-csv.ts`). "Reconhecer formato de banco real" aqui significa
 * detectar delimitador/cabeçalho/formato de data/formato de valor/encoding
 * por heurística — nunca parsers hardcoded por banco específico, e a
 * classificação de cada linha sempre passa por confirmação humana antes de
 * gravar qualquer coisa (ver use-cases de preview/confirm).
 */

/** CSV de fatura/extrato é texto puro — 2MB cobre milhares de linhas com folga. */
export const MAX_CSV_IMPORT_SIZE_BYTES = 2 * 1024 * 1024;

const DATE_HEADERS = ['data', 'date', 'dt'];
const DESCRIPTION_HEADERS = [
  'descricao',
  'description',
  'historico',
  'lancamento',
  'estabelecimento',
  'title',
];
const VALUE_HEADERS = ['valor', 'value', 'amount'];

/** Remove acentos e normaliza caixa — usado só pra casar nome de coluna, nunca pra exibição. */
function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Decodifica o buffer bruto do arquivo. Tenta UTF-8 primeiro; se aparecer
 * caractere de substituição (U+FFFD — sinal de que o buffer não era UTF-8
 * de verdade), tenta Windows-1252 (encoding comum em exports mais antigos
 * de banco brasileiro).
 */
export function decodeCsvBuffer(buffer: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!utf8.includes('�')) return utf8;
  return new TextDecoder('windows-1252', { fatal: false }).decode(buffer);
}

/** Conta ocorrências de cada delimitador candidato na primeira linha não vazia. */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine =
    text.split(/\r?\n/).find((line) => line.trim() !== '') ?? '';
  const counts: [',' | ';' | '\t', number][] = [
    [',', (firstLine.match(/,/g) ?? []).length],
    [';', (firstLine.match(/;/g) ?? []).length],
    ['\t', (firstLine.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  const [best, count] = counts[0]!;
  return count > 0 ? best : ',';
}

/**
 * Parser RFC4180-ish: campos entre aspas (com aspas duplas escapadas),
 * delimitador e quebra de linha configuráveis. Linhas totalmente vazias são
 * descartadas.
 */
export function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === delimiter) {
      pushField();
      i++;
      continue;
    }
    if (char === '\r') {
      i++;
      continue;
    }
    if (char === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

export interface ColumnMapping {
  dateCol: number;
  descriptionCol: number;
  valueCol: number;
  /** false = não achou cabeçalho reconhecível, assumiu posição (col 0/1/última) — avisar na UI. */
  headerDetected: boolean;
}

export function detectColumnMapping(headerRow: string[]): ColumnMapping {
  const normalized = headerRow.map(normalizeHeader);
  const dateCol = normalized.findIndex((h) => DATE_HEADERS.includes(h));
  const descriptionCol = normalized.findIndex((h) =>
    DESCRIPTION_HEADERS.includes(h)
  );
  const valueCol = normalized.findIndex((h) => VALUE_HEADERS.includes(h));

  if (dateCol >= 0 && descriptionCol >= 0 && valueCol >= 0) {
    return { dateCol, descriptionCol, valueCol, headerDetected: true };
  }
  return {
    dateCol: 0,
    descriptionCol: 1,
    valueCol: Math.max(headerRow.length - 1, 2),
    headerDetected: false,
  };
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/** Tenta YYYY-MM-DD, depois DD/MM/YYYY e DD-MM-YYYY (prioridade contexto BR). Devolve YYYY-MM-DD normalizado. */
export function parseDate(raw: string): string | null {
  const trimmed = raw.trim();

  let m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m.map(Number) as [number, number, number, number];
    if (!isValidDateParts(y, mo, d)) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
  }

  m = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) {
    const [, dStr, moStr, yStr] = m;
    const d = Number(dStr);
    const mo = Number(moStr);
    const y = Number(yStr);
    if (!isValidDateParts(y, mo, d)) return null;
    return `${yStr}-${moStr}-${dStr}`;
  }

  return null;
}

/**
 * Trata `1.234,56` / `1234.56` / `-50,00` / `(50,00)` / `R$ 50,00`. Quando os
 * dois separadores aparecem juntos, o último símbolo encontrado é o decimal
 * (o outro é separador de milhar) — convenção que cobre tanto BR (ponto=milhar,
 * vírgula=decimal) quanto EN (inverso).
 */
export function parseAmountCents(raw: string): number | null {
  let s = raw.trim();
  if (s === '') return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/^R\$\s*/i, '').trim();
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1).trim();
  } else if (s.startsWith('+')) {
    s = s.slice(1).trim();
  }

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let normalized: string;
  if (hasComma && hasDot) {
    normalized =
      s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
  } else if (hasComma) {
    normalized = s.replace(',', '.');
  } else {
    normalized = s;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return negative ? -cents : cents;
}

export interface InstallmentMatch {
  number: number;
  total: number;
  /** Descrição com o sufixo "NN/NN" removido. */
  cleanDescription: string;
}

/**
 * Reconhece "NN/NN" no FIM da descrição (precedido de espaço ou início da
 * string — nunca colado a outro dígito) com validação de que faz sentido
 * como parcela: número atual ≤ total, total entre 2 e 48 (mesmo teto de
 * `INSTALLMENT_OPTIONS`). Mesmo passando nessas checagens, a classificação
 * final ainda depende de confirmação humana no preview — isso aqui só
 * descarta os falsos positivos óbvios (ex. "24/7", que falha por 24 > 7).
 */
export function detectInstallment(
  description: string
): InstallmentMatch | null {
  const match = description.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})\s*$/);
  if (!match) return null;

  const number = Number(match[1]);
  const total = Number(match[2]);
  if (!(total >= 2 && total <= 48 && number >= 1 && number <= total)) {
    return null;
  }

  const cleanDescription = description.slice(0, match.index).trim();
  if (cleanDescription.length === 0) return null;

  return { number, total, cleanDescription };
}
