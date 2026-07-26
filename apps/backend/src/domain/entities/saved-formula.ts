import type {
  SavedFormulaDisplayFormat,
  SavedFormulaPinnedTo,
} from '@finance/shared';

export interface SavedFormula {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  expression: string;
  displayFormat: SavedFormulaDisplayFormat;
  pinnedTo: SavedFormulaPinnedTo;
  createdAt: Date;
  updatedAt: Date;
}
