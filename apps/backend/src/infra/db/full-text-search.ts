/**
 * Busca full-text do Postgres (tsvector/to_tsquery + índice GIN) — nunca
 * ILIKE, que não usa índice em padrões com `%` à esquerda (`%termo%`) e por
 * isso vira sequential scan em tabelas grandes. Ver CLAUDE.md: regra de
 * qualquer busca por palavra no projeto.
 *
 * Cada palavra do texto digitado vira um termo de prefixo (`termo:*`), unidos
 * por AND — separado por espaço, "busca like o vídeo" (prefixo, não
 * substring solta no meio da palavra). Ex.: "impor csv" -> "impor:* & csv:*".
 *
 * Usado como: `sql`${tabela.searchVector} @@ to_tsquery('portuguese', ${query})``
 * (ou config `'simple'` quando a coluna já vem pré-normalizada, ver
 * `transactions.searchVector`).
 */
const TSQUERY_SPECIAL_CHARS = /[&|!():*'"\\]/g;

/**
 * Retorna `null` quando não sobra nenhuma palavra válida (string vazia ou só
 * caracteres especiais) — quem chama deve tratar `null` como "sem filtro de
 * busca", nunca passar pra `to_tsquery` (uma tsquery vazia dá erro no
 * Postgres).
 */
export function toPrefixTsQuery(raw: string): string | null {
  const words = raw
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(TSQUERY_SPECIAL_CHARS, ''))
    .filter(Boolean);
  if (words.length === 0) return null;
  return words.map((word) => `${word}:*`).join(' & ');
}
