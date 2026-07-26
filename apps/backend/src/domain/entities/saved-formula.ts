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
  createdAt: Date;
  updatedAt: Date;
}
