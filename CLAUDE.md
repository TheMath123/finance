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
