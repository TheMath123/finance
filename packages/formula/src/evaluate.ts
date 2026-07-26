import { type Either, left, right } from '@finance/shared';
import { Parser } from 'expr-eval';

/** expr-eval não tipa `binaryOps`/`ternaryOps` no `.d.ts`, mas existem em runtime. */
type ParserInternals = Parser & {
  binaryOps: Record<string, unknown>;
  ternaryOps: Record<string, unknown>;
};

export type FormulaError =
  | { type: 'invalid_expression' }
  | { type: 'unknown_variable'; tokens: string[] }
  | { type: 'evaluation_error' };

/**
 * Só aritmética (+ - * / parênteses, incluindo unário -/+ pra números
 * negativos) — sem funções, constantes ou operadores do expr-eval além
 * desses. A opção `operators` do construtor só controla a gramática de
 * operadores simbólicos (^, %, ==, ...); funções nomeadas (sqrt, sin,
 * pow, min, ...) vivem em mapas separados (`unaryOps`/`binaryOps`/
 * `ternaryOps`/`functions`) que não são afetados por ela — por isso os
 * mapas são substituídos diretamente aqui, mantendo só o essencial.
 * Fórmula do usuário nunca vira SQL/código dinâmico: os únicos
 * identificadores aceitos são os presentes em `variables`.
 */
const parser = new Parser() as ParserInternals;
parser.functions = {};
parser.unaryOps = { '-': parser.unaryOps['-'], '+': parser.unaryOps['+'] };
parser.binaryOps = {
  '+': parser.binaryOps['+'],
  '-': parser.binaryOps['-'],
  '*': parser.binaryOps['*'],
  '/': parser.binaryOps['/'],
};
parser.ternaryOps = {};
parser.consts = {};

export function evaluateFormula(
  expression: string,
  variables: Record<string, number>
): Either<FormulaError, number> {
  let parsed: ReturnType<typeof parser.parse>;
  try {
    parsed = parser.parse(expression);
  } catch {
    return left({ type: 'invalid_expression' });
  }

  const unknown = parsed.variables().filter((name) => !(name in variables));
  if (unknown.length > 0) {
    return left({ type: 'unknown_variable', tokens: unknown });
  }

  let result: unknown;
  try {
    result = parsed.evaluate(variables);
  } catch {
    return left({ type: 'evaluation_error' });
  }

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    return left({ type: 'evaluation_error' });
  }
  return right(result);
}
