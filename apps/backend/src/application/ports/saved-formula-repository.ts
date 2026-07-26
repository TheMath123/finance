import type {
  SavedFormulaDisplayFormat,
  SavedFormulaPinnedTo,
} from '@finance/shared';
import type { SavedFormula } from '../../domain/entities/saved-formula';

export interface SavedFormulaDraft {
  name: string;
  expression: string;
  displayFormat: SavedFormulaDisplayFormat;
  pinnedTo: SavedFormulaPinnedTo;
}

export interface SavedFormulaPatch {
  name?: string;
  expression?: string;
  displayFormat?: SavedFormulaDisplayFormat;
  pinnedTo?: SavedFormulaPinnedTo;
}

export interface SavedFormulaRepository {
  create(
    workspaceId: string,
    createdByUserId: string,
    draft: SavedFormulaDraft
  ): Promise<SavedFormula>;
  findInWorkspace(
    workspaceId: string,
    formulaId: string
  ): Promise<SavedFormula | undefined>;
  listByWorkspace(workspaceId: string): Promise<SavedFormula[]>;
  update(formulaId: string, patch: SavedFormulaPatch): Promise<SavedFormula>;
  delete(formulaId: string): Promise<void>;
  countByWorkspace(workspaceId: string): Promise<number>;
}
