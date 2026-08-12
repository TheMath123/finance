import { describe, expect, test } from 'bun:test';
import {
  decodeCsvBuffer,
  detectColumnMapping,
  detectDelimiter,
  detectInstallment,
  parseAmountCents,
  parseCsvRows,
  parseDate,
} from './csv-import';

describe('detectDelimiter', () => {
  test('reconhece vírgula, ponto-e-vírgula e tab pela primeira linha', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  test('sem delimitador reconhecível, assume vírgula', () => {
    expect(detectDelimiter('coluna-unica\nvalor')).toBe(',');
  });
});

describe('parseCsvRows', () => {
  test('parseia CSV simples', () => {
    expect(parseCsvRows('a,b,c\n1,2,3', ',')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  test('campo entre aspas com delimitador embutido', () => {
    expect(
      parseCsvRows('data,descricao,valor\n01/01/2026,"Loja, Filial 2",100', ',')
    ).toEqual([
      ['data', 'descricao', 'valor'],
      ['01/01/2026', 'Loja, Filial 2', '100'],
    ]);
  });

  test('aspas duplas escapadas dentro de campo com aspas', () => {
    expect(parseCsvRows('a\n"ele disse ""oi"""', ',')).toEqual([
      ['a'],
      ['ele disse "oi"'],
    ]);
  });

  test('ignora linhas totalmente vazias', () => {
    expect(parseCsvRows('a,b\n\n1,2\n', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('decodeCsvBuffer', () => {
  test('decodifica UTF-8 normalmente', () => {
    const buffer = new TextEncoder().encode('Descrição,Valor\nCafé,10,50');
    expect(decodeCsvBuffer(buffer)).toBe('Descrição,Valor\nCafé,10,50');
  });

  test('cai pra windows-1252 quando UTF-8 gera caractere de substituição', () => {
    // "É" em Windows-1252 é o byte 0xC9 — inválido como início de sequência UTF-8 sozinho.
    const latin1Buffer = new Uint8Array([0xc9, 0x20, 0x45]); // "É E" em Windows-1252
    const decoded = decodeCsvBuffer(latin1Buffer);
    expect(decoded).not.toContain('�');
  });
});

describe('detectColumnMapping', () => {
  test('reconhece cabeçalho em português', () => {
    expect(detectColumnMapping(['Data', 'Descrição', 'Valor'])).toEqual({
      dateCol: 0,
      descriptionCol: 1,
      valueCol: 2,
      headerDetected: true,
    });
  });

  test('reconhece cabeçalho em inglês, ordem diferente', () => {
    expect(detectColumnMapping(['Amount', 'Date', 'Description'])).toEqual({
      dateCol: 1,
      descriptionCol: 2,
      valueCol: 0,
      headerDetected: true,
    });
  });

  test('sem cabeçalho reconhecível, assume posição e marca headerDetected false', () => {
    const result = detectColumnMapping(['x', 'y', 'z']);
    expect(result.headerDetected).toBe(false);
    expect(result.dateCol).toBe(0);
    expect(result.descriptionCol).toBe(1);
  });
});

describe('parseDate', () => {
  test('YYYY-MM-DD', () => {
    expect(parseDate('2026-03-15')).toBe('2026-03-15');
  });

  test('DD/MM/YYYY', () => {
    expect(parseDate('15/03/2026')).toBe('2026-03-15');
  });

  test('DD-MM-YYYY', () => {
    expect(parseDate('15-03-2026')).toBe('2026-03-15');
  });

  test('data inválida (dia/mês fora do range) retorna null', () => {
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('2026-13-01')).toBeNull();
  });

  test('formato não reconhecido retorna null', () => {
    expect(parseDate('março de 2026')).toBeNull();
  });
});

describe('parseAmountCents', () => {
  test('formato BR: vírgula decimal, ponto de milhar', () => {
    expect(parseAmountCents('1.234,56')).toBe(123_456);
    expect(parseAmountCents('50,00')).toBe(5_000);
  });

  test('formato EN: ponto decimal', () => {
    expect(parseAmountCents('1234.56')).toBe(123_456);
  });

  test('negativo com sinal e com parênteses', () => {
    expect(parseAmountCents('-50,00')).toBe(-5_000);
    expect(parseAmountCents('(50,00)')).toBe(-5_000);
  });

  test('prefixo R$', () => {
    expect(parseAmountCents('R$ 99,90')).toBe(9_990);
  });

  test('vazio ou não numérico retorna null', () => {
    expect(parseAmountCents('')).toBeNull();
    expect(parseAmountCents('abc')).toBeNull();
  });
});

describe('detectInstallment', () => {
  test('reconhece parcela válida no fim da descrição', () => {
    expect(detectInstallment('COMPRA LOJA X 03/12')).toEqual({
      number: 3,
      total: 12,
      cleanDescription: 'COMPRA LOJA X',
    });
  });

  test('rejeita quando número atual > total (não é sequência válida de parcela)', () => {
    expect(detectInstallment('ALGO 24/7')).toBeNull();
  });

  test('rejeita total fora do range 2-48', () => {
    expect(detectInstallment('COMPRA 1/1')).toBeNull();
    expect(detectInstallment('COMPRA 1/60')).toBeNull();
  });

  test('rejeita padrão não colado ao fim (número no meio da descrição)', () => {
    expect(detectInstallment('PEDIDO 03/12 CANCELADO')).toBeNull();
  });

  test('rejeita quando a descrição é só o número (sem texto real antes)', () => {
    expect(detectInstallment('03/12')).toBeNull();
  });

  test('descrição sem padrão de parcela retorna null', () => {
    expect(detectInstallment('COMPRA LOJA X')).toBeNull();
  });
});
