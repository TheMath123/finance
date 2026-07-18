# M2-11 — Export CSV (portabilidade LGPD)

**Status:** 🟢 Concluída.

## Contexto

Spec (Milestones, M2): "export CSV (portabilidade LGPD)" — direito do titular
de portar os próprios dados (LGPD), independente de exclusão de conta.

**Decisões tomadas sem bloquear (2026-07-18, ver relatório final da sessão
pra revisão do usuário):**
- **Escopo:** CSV único de transações (com nomes de categoria/conta/cartão
  já resolvidos, não IDs). Não foram exportados bancos/contas/cartões/
  categorias em arquivos separados — são metadados de configuração, de
  baixa sensibilidade, que o usuário já vê inteiros na própria UI; o que a
  portabilidade LGPD tipicamente visa são os dados financeiros de fato
  (transações). Pode ser revisitado se o usuário quiser um export mais
  completo.
- **Síncrono, sem job assíncrono:** o teste de performance do M2-08 (500 mil
  transações sintéticas num workspace só, `EXPLAIN ANALYZE`, ~27ms numa
  agregação) mostrou que o volume real de um workspace de finanças pessoais
  não chega perto de justificar processamento assíncrono pra um SELECT
  simples com ORDER BY.

## Implementação

### Backend
- `domain/services/transactions-csv.ts` — `buildTransactionsCsv`: função
  pura, monta o CSV (RFC 4180 — aspas ao redor de campos com vírgula/aspas/
  quebra de linha) com cabeçalho em português (Data, Descrição, Valor,
  Tipo, Método, Categoria, Conta, Cartão, Parcela, Origem). Valor convertido
  de centavos pra reais (`/100`, 2 casas). Tipo/Método/Origem traduzidos
  pra rótulos legíveis.
- `application/ports/transaction-repository.ts` +
  `infra/db/repositories/transaction.repository.ts` — `listForExport`: join
  transactions + categories (nome) + bankAccounts (nome) + cards (nome),
  filtra `deleted_at IS NULL`, ordena por data. Sem limite de página (é
  export completo, não listagem paginada).
- `application/use-cases/transaction/export-transactions-csv.ts` —
  `exportTransactionsCsv(deps, actor)`: busca as linhas e monta o CSV.
- `http/modules/transaction/routes/export-transactions.ts` —
  `GET /workspaces/:workspaceId/export.csv`, `Content-Type: text/csv`,
  `Content-Disposition: attachment`. Exige papel `admin`/`owner`
  (`requireWorkspaceRole(..., "admin")`) — dado sensível do workspace
  inteiro, mesmo padrão de proteção usado nas outras rotas administrativas.

### Mobile
- `lib/api-client.ts` — `apiRequestText`: variante de `apiRequest` que
  devolve o corpo cru como texto em vez de fazer parse de JSON (mesmo
  fluxo de auth/refresh automático).
- `lib/workspace-api.ts` — `workspaceApi.exportTransactionsCsv`.
- `app/(app)/workspaces/[workspaceId]/members.tsx` (tela de administração
  do workspace, onde já vive a gestão de papéis/convites) — botão
  "Exportar dados (CSV)", visível só pra quem já vê "Convidar" (`admin`/
  `owner`). Salva o CSV num arquivo temporário (`expo-file-system`, API
  nova baseada em classes — `File`/`Paths`, não a antiga
  `FileSystem.writeAsStringAsync`) e abre o compartilhamento nativo
  (`expo-sharing`). Pacotes novos instalados via `expo install` (não
  `bun add` cru, pra garantir a versão compatível com o SDK 57).

## Testes

- `domain/services/transactions-csv.test.ts` (4 testes): cabeçalho +
  conversão de centavos/rótulos, escape RFC 4180 de vírgula/aspas,
  formatação de parcela, CSV vazio.
- `application/use-cases/transaction/export-transactions-csv.test.ts`
  (3 testes, contra Postgres): workspace sem transações, transação
  lançada aparece com nomes resolvidos, transação excluída (soft delete)
  não aparece.
- 106/106 testes da suíte do backend passando, typecheck limpo (backend
  e mobile).
- **Não testado automaticamente:** o fluxo de compartilhamento nativo em
  si (`expo-sharing`) só roda de verdade num dispositivo/simulador — não
  dá pra automatizar aqui. Ver relatório final pra roteiro de verificação
  manual.

## Dependências

Nenhuma técnica — era independente das outras tasks do M2.
