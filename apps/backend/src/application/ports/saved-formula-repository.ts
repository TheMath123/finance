import type { SavedFormulaDisplayFormat } from '@finance/shared';
import type { SavedFormula } from '../../domain/entities/saved-formula';

export interface SavedFormulaDraft {
  name: string;
  expression: string;
  displayFormat: SavedFormulaDisplayFormat;
  pinnedHome: boolean;
  pinnedTransactions: boolean;
}

export interface SavedFormulaPatch {
  name?: string;
  expression?: string;
  displayFormat?: SavedFormulaDisplayFormat;
  pinnedHome?: boolean;
  pinnedTransactions?: boolean;
  /** Ordem do widget fixado (drag-and-drop, M5-01c) — null desfixa a ordem (ex.: ao despin). */
  homeOrder?: number | null;
  transactionsOrder?: number | null;
}

export type SavedFormulaOrderField = 'homeOrder' | 'transactionsOrder';

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
  /** Maior valor de `homeOrder`/`transactionsOrder` já usado no workspace, ou -1 se nenhuma fórmula fixada tiver ordem ainda — próxima posição é o retorno + 1. */
  maxOrder(workspaceId: string, field: SavedFormulaOrderField): Promise<number>;
}
