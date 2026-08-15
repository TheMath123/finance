# Remover dependência `expr-eval` (RCE sem correção) — parser próprio

**Status:** 🟢 Concluída (2026-08-15), validada com testes (novos + os já
existentes de `saved-formula` no backend) + typecheck + lint, todos
forçados sem cache.

## Contexto

Dependabot sinalizou `expr-eval@2.0.2` (versão publicada mais recente, usada
em `packages/formula`) com uma vulnerabilidade de RCE: `evaluate()` pode
executar código arbitrário se receber um `variables` malicioso. **Sem
correção disponível** — o pacote está efetivamente abandonado.

Perguntei ao usuário se dava pra só mitigar; a resposta foi construir uma
substituição própria em vez de continuar dependendo da lib. Fazia sentido:
o wrapper que já existia (`evaluateFormula` em `packages/formula/src/
evaluate.ts`) já zerava `functions`/`consts`/`ternaryOps` do parser do
`expr-eval` pra restringir tudo a só aritmética básica (`+ - * /`,
parênteses, +/- unário) — ou seja, o subconjunto realmente usado já era
mínimo o bastante pra reimplementar do zero sem perder nada.

## O que foi feito

- **`packages/formula/src/evaluate.ts`** reescrito do zero: tokenizer +
  parser recursive-descent (precedência padrão: unário > `* /` > `+ -`,
  associação à esquerda) + avaliador de árvore, tudo sem dependência
  externa. Mesma assinatura pública (`evaluateFormula(expression,
  variables): Either<FormulaError, number>`), mesmos 3 tipos de erro
  (`invalid_expression`, `unknown_variable` com `tokens`,
  `evaluation_error`) — **zero mudança em qualquer call site** (backend,
  dashboard, mobile continuam chamando exatamente igual).
- **Checagem de variável desconhecida usa `Object.hasOwn`, não `in`** —
  `in` percorre a prototype chain, então nomes como `constructor` ou
  `toString` pareceriam "conhecidos" mesmo sem estar no catálogo real de
  variáveis (`formula-variables.ts`). Checagem estrita de own-property é
  parte deliberada da defesa contra `variables` hostil — o mesmo tipo de
  brecha que motivou trocar o `expr-eval` no primeiro lugar.
- **`packages/formula/src/evaluate.test.ts`** (novo): 21 testes cobrindo
  aritmética básica, precedência, parênteses, unário, decimais, variáveis
  conhecidas/desconhecidas (single + múltiplas deduplicadas), todos os
  casos de sintaxe inválida (parêntese não fechado/sobrando, operador sem
  operando, tokens adjacentes, caractere fora da gramática),
  `evaluation_error` (divisão por zero, `0/0`), e — regressão direta do que
  motivou a troca — um `variables` com chaves hostis (`__proto__`,
  `constructor`, `toString`) provando que não afetam o resultado nem
  vazam por herança de protótipo.
- **`expr-eval` removida** de `packages/formula/package.json` via
  `bun remove` (CLI, não editado à mão) — dependência zero agora, exceto
  `@finance/shared` (workspace).
- **`@types/bun`** adicionada como devDependency (via `bun add -d`) — só
  pra resolver os tipos de `bun:test` no novo arquivo de teste; o pacote
  não tinha testes próprios antes (só cobertura indireta via
  `saved-formula.test.ts` no backend).
- **`packages/formula/package.json`** ganhou script `"test": "bun test"`.

## Verificação

- `bun test` em `packages/formula` — 21/21 OK.
- `bun test src/application/use-cases/saved-formula/` no backend — 16/16 OK
  (cobertura indireta de `evaluateFormula` via `evaluateSavedFormula`/
  `createSavedFormula`/`updateSavedFormula`, sem nenhuma mudança de
  comportamento observável).
- `bunx turbo run typecheck --force` (monorepo inteiro, sem cache) — 9/9
  OK, 0 erros.
- `bun run lint` (Biome) — limpo.
- Confirmado via `grep` que `expr-eval` não aparece mais em nenhum
  `package.json` nem em `bun.lock`.
