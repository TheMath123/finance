import { describe, expect, test } from 'bun:test';
import {
  buildTransactionsCsv,
  type TransactionExportRow,
} from './transactions-csv';

function row(
  overrides: Partial<TransactionExportRow> = {}
): TransactionExportRow {
  return {
    date: '2026-07-10',
    description: 'mercado',
    amount: 15_000,
    type: 'expense',
    method: 'pix',
    categoryName: 'Mercado',
    accountName: 'Conta principal',
    toAccountName: null,
    cardName: null,
    installmentNumber: null,
    installmentTotal: null,
    source: 'app',
    ...overrides,
  };
}

describe('buildTransactionsCsv', () => {
  test('cabeçalho + uma linha, valores convertidos de centavos e rótulos em PT-BR', () => {
    const csv = buildTransactionsCsv([row()]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'Data,Descrição,Valor,Tipo,Método,Categoria,Conta,Conta destino,Cartão,Parcela,Origem'
    );
    expect(lines[1]).toBe(
      '2026-07-10,mercado,150.00,Despesa,Pix,Mercado,Conta principal,,,,App'
    );
  });

  test('transferência: conta de destino aparece na coluna própria (auditoria 2026-07-19)', () => {
    const csv = buildTransactionsCsv([
      row({
        method: 'transfer',
        accountName: 'Conta origem',
        toAccountName: 'Conta destino',
      }),
    ]);
    const line = csv.split('\r\n')[1]!;
    expect(line).toContain(',Conta origem,Conta destino,');
  });

  test('escapa descrição com vírgula e aspas (RFC 4180)', () => {
    const csv = buildTransactionsCsv([
      row({ description: 'compra, com "aspas"' }),
    ]);
    expect(csv).toContain('"compra, com ""aspas"""');
  });

  test('formata parcela como número/total', () => {
    const csv = buildTransactionsCsv([
      row({
        installmentNumber: 2,
        installmentTotal: 5,
        cardName: 'Nubank',
        accountName: null,
      }),
    ]);
    const line = csv.split('\r\n')[1]!;
    expect(line).toContain(',Nubank,2/5,');
  });

  test('sem transações, devolve só o cabeçalho', () => {
    const csv = buildTransactionsCsv([]);
    expect(csv.split('\r\n')).toHaveLength(1);
  });
});
