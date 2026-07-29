import type { SavedFormulaDisplayFormat } from '@finance/shared';

export interface SavedFormula {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  expression: string;
  displayFormat: SavedFormulaDisplayFormat;
  /** Fixação não é exclusiva — pode estar em nenhuma, uma ou nas duas telas ao mesmo tempo. */
  pinnedHome: boolean;
  pinnedTransactions: boolean;
  /** Ordem de exibição do widget fixado (drag-and-drop, M5-01c) — null quando não fixada naquela tela. */
  homeOrder: number | null;
  transactionsOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}
