# 02 — Filtros completos na lista de transações

**Status:** 🟢 Concluída (2026-07-15).

## Contexto

A spec (seção Funcionalidades > App) promete busca por "texto, período, categoria,
conta/cartão e membro do workspace". `apps/mobile/src/app/(app)/(tabs)/explore.tsx`
(caminho atualizado após a reorganização de rotas em grupo `(tabs)`) hoje só
expõe 2 dos 5 filtros (texto + categoria). O backend e os índices já suportam tudo
(`from`, `to`, `accountId`, `cardId`, `createdBy` em `listTransactionsSchema` e no
repositório) — é trabalho só de UI.

## Escopo

- Filtro por período: usar o `DateField`/`DatePicker` já existente (dois campos, "de"
  e "até", ou um único componente de range se preferir simplificar).
- Filtro por conta/cartão: reusar o padrão de `SelectField`/`Select`, populando com
  `accountsApi.list` + `cardsApi.list` (mesma tela já busca isso pra outros usos).
- Filtro por membro (`createdBy`): só relevante quando workspace for compartilhado
  (M2) — **pode esperar**, não implementar agora (não há como um workspace ter mais
  de um membro no M1).

## Próximo passo

Adicionar os dois filtros que fazem sentido hoje (período, conta/cartão) na tela de
Transações, sem quebrar a busca por texto/categoria já existente. Filtro por membro
fica anotado aqui pra quando o M2 trouxer workspaces compartilhados.

## Implementação

Filtro de período (dois `DatePicker`, "De"/"Até") e conta/cartão (dois `Select`,
cada um com opção "Todas/Todos") adicionados atrás de um botão "Filtros" (ícone de
funil, ao lado do Select de categoria) que expande um painel — mantém a tela limpa
quando não usados, com indicador visual (ícone preenchido) quando algum filtro
avançado está ativo, e um "Limpar" que reseta só esses 4 campos.

Arquivos alterados:
- `apps/mobile/src/app/(app)/(tabs)/explore.tsx` — estado dos novos filtros, painel de UI,
  `queryKey`/`queryFn` do `useQuery` de transações passando a incluir `accountId`,
  `cardId`, `from`, `to`.
- `apps/mobile/src/components/form/date-field.tsx` — `formatIsoDate` exportado
  (antes privado do arquivo) para reaproveitar a conversão local `Date -> YYYY-MM-DD`
  sem duplicar lógica.

`ListTransactionsFilters` (`apps/mobile/src/lib/transactions-api.ts`) já tinha todos
os campos (`accountId`, `cardId`, `from`, `to`) — nenhuma alteração necessária ali.
