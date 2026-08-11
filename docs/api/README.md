# Documentação da API — OpenAPI

`openapi.json` é o spec OpenAPI 3.0 completo do backend (todos os endpoints,
gerado a partir do código-fonte real das rotas — schemas Zod, guards de
autenticação, use-cases — não escrito à mão). Validado com `redocly lint`
(0 erros).

## Estrutura

- **`fragments/*.json`** — um fragmento por módulo (`auth.json`, `card.json`,
  etc.), cada um com só `paths` + `components.schemas` daquele módulo. É a
  fonte da verdade — edite aqui se precisar corrigir/ampliar a doc de um
  endpoint específico.
- **`openapi.json`** — spec único, **gerado** a partir dos fragmentos (não
  editar direto — a próxima geração sobrescreve). Regenerar com:

  ```
  bun run docs:api
  ```

## Importar no Apidog

1. Apidog → seu projeto → **Import** → **OpenAPI/Swagger** → escolher arquivo
   → selecionar `docs/api/openapi.json`.
2. O Apidog agrupa os endpoints automaticamente pelas `tags` do spec (uma por
   módulo: Autenticação, Transações, Cartões e Faturas, etc.) — isso vira as
   "pastas"/seções dentro do projeto.
3. Depois de importado, configure no Apidog uma variável de ambiente
   `{{accessToken}}` recebendo o valor de `API_ACCESS_TOKEN` (gerado por
   `bun run auth:login`, ver `.env.example` na raiz do repo) e aplique como
   `Authorization: Bearer {{accessToken}}` no ambiente — o spec já declara
   `bearerAuth` como esquema de segurança padrão em toda rota autenticada.
4. Reimportar o mesmo arquivo depois de rodar `bun run docs:api` de novo
   mantém o projeto sincronizado (Apidog atualiza por diff, sem duplicar).

## O que está documentado

131 operations em 16 módulos/tags — path completo, método, autenticação
exigida (papel mínimo de workspace quando aplicável), path/query params
tipados com obrigatoriedade real (batendo com `.optional()` do Zod), body
tipado por schema nomeado, e resposta de sucesso + erro genérico.

Exemplos em toda a documentação são **fictícios** — nenhum dado real do
seed/testes/produção foi usado.
