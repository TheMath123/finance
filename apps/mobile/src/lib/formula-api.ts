import { apiRequest } from '@/lib/api-client';

/** Espelha SavedFormula (backend, domain/entities/saved-formula.ts — datas serializadas). */
export interface SavedFormula {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  expression: string;
  displayFormat: 'currency' | 'number';
  pinnedHome: boolean;
  pinnedTransactions: boolean;
  /** Ordem de exibição do widget fixado (drag-and-drop, M5-01c) — null quando não fixada naquela tela. */
  homeOrder: number | null;
  transactionsOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedFormulaInput {
  name: string;
  expression: string;
  displayFormat: 'currency' | 'number';
  pinnedHome: boolean;
  pinnedTransactions: boolean;
}

export type UpdateSavedFormulaInput = Partial<SavedFormulaInput>;

export const formulaApi = {
  list: (workspaceId: string) =>
    apiRequest<SavedFormula[]>(`/workspaces/${workspaceId}/saved-formulas`),

  create: (workspaceId: string, input: SavedFormulaInput) =>
    apiRequest<SavedFormula>(`/workspaces/${workspaceId}/saved-formulas`, {
      method: 'POST',
      body: input,
    }),

  update: (
    workspaceId: string,
    formulaId: string,
    input: UpdateSavedFormulaInput
  ) =>
    apiRequest<SavedFormula>(
      `/workspaces/${workspaceId}/saved-formulas/${formulaId}`,
      {
        method: 'PATCH',
        body: input,
      }
    ),

  delete: (workspaceId: string, formulaId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/saved-formulas/${formulaId}`, {
      method: 'DELETE',
    }),

  /** Reorder dos widgets fixados via drag-and-drop (react-native-draggable-flatlist). */
  reorder: (
    workspaceId: string,
    field: 'home' | 'transactions',
    formulaIds: string[]
  ) =>
    apiRequest<SavedFormula[]>(
      `/workspaces/${workspaceId}/saved-formulas/reorder`,
      {
        method: 'PATCH',
        body: { field, formulaIds },
      }
    ),
};
