# M2-11 — Export CSV (portabilidade LGPD)

**Status:** 🔵 Backlog — não iniciada.

## Contexto

Spec (Milestones, M2): "export CSV (portabilidade LGPD)" — direito do titular
de portar os próprios dados (LGPD), independente de exclusão de conta.

## Escopo

### Backend
- `GET /workspaces/:id/export.csv` (ou job assíncrono + link de download, se
  o volume justificar) — exporta transações do workspace (todas as colunas
  relevantes: data, descrição, valor, categoria, conta/cartão, método).
  Exigir papel `owner`/`admin` (dado sensível do workspace inteiro).
- Considerar exportar também bancos/contas/cartões/categorias em arquivos
  separados, ou um único CSV consolidado — decidir com o usuário antes de
  implementar (é decisão de produto simples, mas evita retrabalho).

### Mobile
- Botão "Exportar dados" nas configurações do workspace, dispara download/
  compartilhamento do arquivo (`expo-sharing` ou similar).

## Dependências

Nenhuma técnica — é independente das outras tasks do M2, pode ser feita a
qualquer momento.

## Próximo passo

Confirmar com o usuário o formato exato (um CSV só de transações, ou export
completo do workspace) antes de implementar.
