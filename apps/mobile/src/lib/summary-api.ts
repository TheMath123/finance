import { apiRequest } from "@/lib/api-client";

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

export const summaryApi = {
  getMonthly: (workspaceId: string, year: number, month: number) =>
    apiRequest<MonthlySummary>(
      `/workspaces/${workspaceId}/summary?year=${year}&month=${month}`,
    ),
};
