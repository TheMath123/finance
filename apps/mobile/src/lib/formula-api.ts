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
};
