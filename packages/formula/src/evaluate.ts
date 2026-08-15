import { type Either, left, right } from '@finance/shared';

export type FormulaError =
  | { type: 'invalid_expression' }
  | { type: 'unknown_variable'; tokens: string[] }
  | { type: 'evaluation_error' };

/**
 * Parser/avaliador de expressões aritméticas escrito do zero, sem
 * dependência externa — só + - * / parênteses e +/- unário (pra números
 * negativos), sem funções, constantes ou qualquer outro operador.
 *
 * Antes usava `expr-eval`, mas a versão publicada (2.0.2, a mais recente —
 * não há correção disponível) tem uma vulnerabilidade de RCE via `evaluate()`
 * com um `variables` malicioso. O subconjunto que a gente usava já era
 * mínimo (o wrapper antigo zerava `functions`/`consts`/`ternaryOps` do
 * parser pra restringir a isso mesmo) — reimplementar do zero elimina a
 * dependência (e o risco) por completo, sem mudar nenhum comportamento
 * observável: mesma assinatura, mesmos erros, mesma gramática.
 */

class ParseError extends Error {}

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'identifier'; name: string }
  | { kind: 'operator'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' };

// Número: `12`, `12.5` ou `.5` — sem notação científica (o teclado da
// calculadora do app não digita isso). Identificador: letras/underscore
// seguido de letras/dígitos/underscore — mesmo alfabeto que os tokens do
// catálogo de variáveis já usam (ver formula-variables.ts no backend).
const NUMBER_PATTERN = /^(?:\d+\.\d+|\.\d+|\d+)/;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*/;
const WHITESPACE_PATTERN = /^\s+/;

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let rest = expression;
  while (rest.length > 0) {
    const whitespace = WHITESPACE_PATTERN.exec(rest);
    if (whitespace) {
      rest = rest.slice(whitespace[0].length);
      continue;
    }

    const char = rest[0];
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ kind: 'operator', value: char });
      rest = rest.slice(1);
      continue;
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      rest = rest.slice(1);
      continue;
    }

    const number = NUMBER_PATTERN.exec(rest);
    if (number) {
      tokens.push({ kind: 'number', value: Number(number[0]) });
      rest = rest.slice(number[0].length);
      continue;
    }

    const identifier = IDENTIFIER_PATTERN.exec(rest);
    if (identifier) {
      tokens.push({ kind: 'identifier', name: identifier[0] });
      rest = rest.slice(identifier[0].length);
      continue;
    }

    throw new ParseError(`caractere inesperado: "${char}"`);
  }
  return tokens;
}

type Node =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: string }
  | { kind: 'unary'; op: '+' | '-'; operand: Node }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: Node; right: Node };

/**
 * Recursive-descent — precedência padrão: unário > `* /` > `+ -`,
 * associando à esquerda. Coleta os identificadores referenciados em
 * `variables` (deduplicados, ordem de primeira aparição) pra checagem de
 * variável desconhecida, igual ao `.variables()` do `expr-eval` antigo.
 */
class Parser {
  private readonly tokens: Token[];
  private pos = 0;
  readonly variables = new Set<string>();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Node {
    if (this.tokens.length === 0) throw new ParseError('expressão vazia');
    const node = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new ParseError('token inesperado após o fim da expressão');
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const token = this.tokens[this.pos];
    if (!token) throw new ParseError('fim inesperado da expressão');
    this.pos += 1;
    return token;
  }

  private parseExpression(): Node {
    let node = this.parseTerm();
    for (
      let token = this.peek();
      token?.kind === 'operator' &&
      (token.value === '+' || token.value === '-');
      token = this.peek()
    ) {
      this.next();
      node = {
        kind: 'binary',
        op: token.value,
        left: node,
        right: this.parseTerm(),
      };
    }
    return node;
  }

  private parseTerm(): Node {
    let node = this.parseUnary();
    for (
      let token = this.peek();
      token?.kind === 'operator' &&
      (token.value === '*' || token.value === '/');
      token = this.peek()
    ) {
      this.next();
      node = {
        kind: 'binary',
        op: token.value,
        left: node,
        right: this.parseUnary(),
      };
    }
    return node;
  }

  private parseUnary(): Node {
    const token = this.peek();
    if (
      token?.kind === 'operator' &&
      (token.value === '+' || token.value === '-')
    ) {
      this.next();
      return { kind: 'unary', op: token.value, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const token = this.next();
    if (token.kind === 'number') return { kind: 'number', value: token.value };
    if (token.kind === 'identifier') {
      this.variables.add(token.name);
      return { kind: 'variable', name: token.name };
    }
    if (token.kind === 'paren' && token.value === '(') {
      const node = this.parseExpression();
      const closing = this.next();
      if (closing.kind !== 'paren' || closing.value !== ')') {
        throw new ParseError('parêntese não fechado');
      }
      return node;
    }
    throw new ParseError('token inesperado');
  }
}

function evaluateNode(node: Node, variables: Record<string, number>): number {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'variable':
      // `evaluateFormula` só chama `evaluateNode` depois de confirmar (via
      // `Object.hasOwn`) que toda variável referenciada existe em
      // `variables` — o `!` aqui reflete essa invariante, não uma aposta.
      return variables[node.name]!;
    case 'unary':
      return node.op === '-'
        ? -evaluateNode(node.operand, variables)
        : evaluateNode(node.operand, variables);
    case 'binary': {
      const left = evaluateNode(node.left, variables);
      const right = evaluateNode(node.right, variables);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
      }
    }
  }
}

export function evaluateFormula(
  expression: string,
  variables: Record<string, number>
): Either<FormulaError, number> {
  let ast: Node;
  let parser: Parser;
  try {
    parser = new Parser(tokenize(expression));
    ast = parser.parse();
  } catch {
    return left({ type: 'invalid_expression' });
  }

  // `Object.hasOwn` (não `in`/`hasOwnProperty` chamado direto no objeto) —
  // `in` percorre a prototype chain, então nomes como "constructor" ou
  // "toString" pareceriam "conhecidos" mesmo sem estar no catálogo real de
  // variáveis. Checagem estrita é parte da defesa contra `variables`
  // hostil, o mesmo tipo de brecha que motivou trocar o expr-eval.
  const unknown = [...parser.variables].filter(
    (name) => !Object.hasOwn(variables, name)
  );
  if (unknown.length > 0) {
    return left({ type: 'unknown_variable', tokens: unknown });
  }

  let result: number;
  try {
    result = evaluateNode(ast, variables);
  } catch {
    return left({ type: 'evaluation_error' });
  }

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    return left({ type: 'evaluation_error' });
  }
  return right(result);
}
