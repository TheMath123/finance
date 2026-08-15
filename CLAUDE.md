# Segurança: identificadores SQL dinâmicos (Drizzle)

**Nunca** use `sql.identifier()` nem `.as(...)` dinâmico (nome de coluna/tabela/alias
construído a partir de input do usuário — query params, body, headers) em nenhum
repositório Drizzle deste monorepo (`packages/db`, `apps/backend`).

**Por quê:** o `drizzle-orm` já teve uma CVE real (GHSA-gpj5-g38j-94v9 /
CVE-2026-39356) por escapar mal os delimitadores de identificador nessas duas APIs,
permitindo injeção de SQL quando o valor vinha de input não confiável. Hoje o
código não usa nenhuma delas — todo `orderBy`/`groupBy` usa objetos de coluna
Drizzle fixos — e a dependência já está atualizada (`>=0.45.2`, que corrige o bug),
mas a proteção real é nunca reintroduzir esse padrão.

**Como aplicar:** se precisar de ordenação/filtro dinâmico no futuro (ex: `?sort=`
vindo de query param), sempre mapear a string recebida para uma coluna Drizzle
fixa via allowlist (switch/map de chaves conhecidas → coluna), nunca construir o
identificador a partir da string crua.

# Busca por palavra: sempre Postgres full-text search, nunca ILIKE

**Nunca** use `ilike(coluna, '%termo%')` (nem `like`) pra busca de texto livre
digitada pelo usuário (nome, e-mail, descrição, título, etc.) em nenhum
repositório Drizzle deste monorepo.

**Por quê:** `ILIKE '%termo%'` (wildcard à esquerda) nunca usa índice — vira
sequential scan em produção conforme a tabela cresce. O padrão certo é
tsvector/to_tsquery do Postgres: uma coluna gerada (`GENERATED ALWAYS AS
(to_tsvector(...)) STORED`) com índice GIN, casada via `@@`.

**Como aplicar:**
1. Schema (`packages/db/src/schema/*.ts`): adicionar coluna `searchVector`
   usando o `tsvector` custom type de `./helpers` + `.generatedAlwaysAs((): SQL
   => sql\`to_tsvector('portuguese', ...)\`)`, e um índice
   `index('tabela_search_vector_idx').using('gin', t.searchVector)` no array
   de config do `pgTable`. Config `'simple'` (sem stemming) quando a coluna-fonte
   já vem normalizada pela aplicação (ver `transactions.descriptionNormalized`).
2. Repositório: usar `toPrefixTsQuery()` de
   `apps/backend/src/infra/db/full-text-search.ts` pra converter o texto
   digitado numa tsquery de prefixo (`"impor csv"` → `"impor:* & csv:*"` —
   cada palavra vira prefixo, casa começo de palavra, não substring solta no
   meio dela), depois filtrar com
   `sql\`${tabela.searchVector} @@ to_tsquery('portuguese', ${tsQuery})\``.
   `toPrefixTsQuery` retorna `null` pra string vazia/só-símbolos — tratar como
   "sem filtro" (nunca passar `null`/string vazia pro `to_tsquery`, que dá erro).

**Trade-off consciente:** full-text search casa por palavra/prefixo, não por
substring arbitrária no meio de uma palavra (isso é o preço de ganhar índice).
Já convertidos pra esse padrão: `feature_flags` (título+descrição+key),
`workspaces` (nome), `users` (nome+e-mail), `transactions` (descrição, via
`descriptionNormalized`).
