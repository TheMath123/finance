import { describe, expect, test } from 'bun:test';
import { evaluateFormula } from './evaluate';

function value(
  expression: string,
  variables: Record<string, number> = {}
): number {
  const result = evaluateFormula(expression, variables);
  if (!result.ok)
    throw new Error(
      `esperava sucesso, veio erro: ${JSON.stringify(result.error)}`
    );
  return result.value;
}

function errorType(
  expression: string,
  variables: Record<string, number> = {}
): string | undefined {
  const result = evaluateFormula(expression, variables);
  if (result.ok)
    throw new Error(`esperava erro, veio sucesso: ${result.value}`);
  return result.error.type;
}

describe('evaluateFormula — aritmética básica', () => {
  test('soma, subtração, multiplicação, divisão', () => {
    expect(value('2 + 3')).toBe(5);
    expect(value('5 - 2')).toBe(3);
    expect(value('4 * 3')).toBe(12);
    expect(value('10 / 4')).toBe(2.5);
  });

  test('precedência: * / antes de + -', () => {
    expect(value('2 + 3 * 4')).toBe(14);
    expect(value('2 * 3 + 4')).toBe(10);
    expect(value('10 - 4 / 2')).toBe(8);
  });

  test('parênteses alteram a precedência', () => {
    expect(value('(2 + 3) * 4')).toBe(20);
    expect(value('2 * (3 + 4)')).toBe(14);
    expect(value('((1 + 2) * (3 + 4))')).toBe(21);
  });

  test('unário: negativo e positivo', () => {
    expect(value('-5')).toBe(-5);
    expect(value('+5')).toBe(5);
    expect(value('3 - -2')).toBe(5);
    expect(value('3 + -2')).toBe(1);
    expect(value('-(2 + 3)')).toBe(-5);
    expect(value('--5')).toBe(5);
  });

  test('decimais', () => {
    expect(value('1.5 + 2.5')).toBe(4);
    expect(value('.5 + .5')).toBe(1);
    expect(value('10.25 * 2')).toBe(20.5);
  });

  test('espaços em branco são ignorados', () => {
    expect(value('  2   +   3  ')).toBe(5);
    expect(value('2+3')).toBe(5);
  });
});

describe('evaluateFormula — variáveis', () => {
  test('substitui variáveis conhecidas', () => {
    expect(value('saldo + despesas', { saldo: 100, despesas: 50 })).toBe(150);
  });

  test('variável desconhecida vira unknown_variable com o(s) token(s)', () => {
    const result = evaluateFormula('saldo + xyz', { saldo: 100 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('unknown_variable');
    if (result.error.type !== 'unknown_variable') return;
    expect(result.error.tokens).toEqual(['xyz']);
  });

  test('lista todas as variáveis desconhecidas, deduplicadas', () => {
    const result = evaluateFormula('a + b + a + c', { a: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('unknown_variable');
    if (result.error.type !== 'unknown_variable') return;
    expect(result.error.tokens).toEqual(['b', 'c']);
  });

  test('token com underscore (formato real do catálogo de variáveis)', () => {
    expect(
      value('despesa_categoria_abc123', { despesa_categoria_abc123: 42 })
    ).toBe(42);
  });
});

describe('evaluateFormula — erros de sintaxe (invalid_expression)', () => {
  test('expressão vazia ou só espaços', () => {
    expect(errorType('')).toBe('invalid_expression');
    expect(errorType('   ')).toBe('invalid_expression');
  });

  test('parêntese não fechado', () => {
    expect(errorType('(1 + 2')).toBe('invalid_expression');
  });

  test('parêntese fechando sem abrir', () => {
    expect(errorType('1 + 2)')).toBe('invalid_expression');
  });

  test('operador binário sem operando', () => {
    expect(errorType('1 +')).toBe('invalid_expression');
    expect(errorType('* 2')).toBe('invalid_expression');
  });

  test('dois números/identificadores adjacentes sem operador', () => {
    expect(errorType('1 2')).toBe('invalid_expression');
    expect(errorType('a b', { a: 1, b: 2 })).toBe('invalid_expression');
  });

  test('caractere fora da gramática (sem funções/constantes)', () => {
    expect(errorType('sqrt(4)')).toBe('invalid_expression');
    // "sqrt" seria um identificador válido (desconhecido) se não fosse o
    // parêntese logo em seguida — mas "$"/"@" não pertencem à gramática.
    expect(errorType('1 $ 2')).toBe('invalid_expression');
    expect(errorType('a @ b')).toBe('invalid_expression');
  });
});

describe('evaluateFormula — evaluation_error (resultado não finito)', () => {
  test('divisão por zero', () => {
    expect(errorType('1 / 0')).toBe('evaluation_error');
  });

  test('0/0 (NaN)', () => {
    expect(errorType('0 / 0')).toBe('evaluation_error');
  });

  test('divisão por variável zero', () => {
    expect(errorType('saldo / zero', { saldo: 10, zero: 0 })).toBe(
      'evaluation_error'
    );
  });
});

describe('evaluateFormula — não é vulnerável a "variables" hostil (motivo da migração)', () => {
  test('chaves tipo prototype-pollution em variables não afetam o resultado', () => {
    // Regressão direta do que motivou a troca do expr-eval: um objeto
    // `variables` com chaves maliciosas não deve ter nenhum efeito — a
    // expressão só lê as variáveis que ela mesma referencia.
    const hostile = {
      saldo: 100,
      __proto__: { polluted: true },
      constructor: 999,
      toString: 123,
    } as unknown as Record<string, number>;
    expect(value('saldo + 1', hostile)).toBe(101);
    // "polluted" só existe na prototype chain (via __proto__ no literal
    // acima), nunca como own property — tem que continuar unknown_variable.
    expect(errorType('polluted', hostile)).toBe('unknown_variable');
  });

  test('variável cujo nome bate com método de Object não quebra nem executa nada extra', () => {
    expect(
      errorType('constructor', {
        /* "constructor" não está no catálogo — deve dar unknown_variable normal, não RCE */
      })
    ).toBe('unknown_variable');
  });
});
