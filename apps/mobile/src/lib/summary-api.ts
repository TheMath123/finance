import { apiRequest } from '@/lib/api-client';

export interface CategorySummary {
  categoryId: string;
  name: string;
  color: string;
  total: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  expense: number;
  byCategory: CategorySummary[];
  totalBalance: number;
  projectedAvailable: number | null;
}

export interface VariableExpenseCategoryEstimate {
  categoryId: string;
  name: string;
  color: string;
  estimated: number;
}

export interface VariableExpenseEstimate {
  byCategory: VariableExpenseCategoryEstimate[];
  total: number;
}

export const summaryApi = {
  getMonthly: (workspaceId: string, year: number, month: number) =>
    apiRequest<MonthlySummary>(
      `/workspaces/${workspaceId}/summary?year=${year}&month=${month}`
    ),
  getVariableExpenseEstimate: (workspaceId: string) =>
    apiRequest<VariableExpenseEstimate>(
      `/workspaces/${workspaceId}/summary/variable-expense-estimate`
    ),
};
