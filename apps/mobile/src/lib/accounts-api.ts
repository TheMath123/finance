import type { AccountType, TransactionType } from '@finance/shared';

import {
  apiRequest,
  apiRequestUpload,
  type UploadFile,
} from '@/lib/api-client';

export interface Account {
  id: string;
  name: string;
  /** Código do catálogo (@finance/shared BANK_CATALOG) — usuário não cadastra banco manualmente. */
  bankCode: string;
  type: AccountType;
  /** Centavos. */
  initialBalance: number;
  /** Centavos — saldo derivado (initialBalance + transações), sempre calculado no backend. */
  balance: number;
  archivedAt: string | null;
}

export interface CreateAccountInput {
  name: string;
  bankCode: string;
  type: AccountType;
  initialBalance: number;
}

export const accountsApi = {
  list: (workspaceId: string) =>
    apiRequest<Account[]>(`/workspaces/${workspaceId}/accounts`),

  create: (workspaceId: string, input: CreateAccountInput) =>
    apiRequest<Account>(`/workspaces/${workspaceId}/accounts`, {
      method: 'POST',
      body: input,
    }),

  update: (
    workspaceId: string,
    accountId: string,
    input: Partial<CreateAccountInput>
  ) =>
    apiRequest<Account>(`/workspaces/${workspaceId}/accounts/${accountId}`, {
      method: 'PATCH',
      body: input,
    }),

  archive: (workspaceId: string, accountId: string) =>
    apiRequest<Account>(
      `/workspaces/${workspaceId}/accounts/${accountId}/archive`,
      { method: 'POST' }
    ),

  unarchive: (workspaceId: string, accountId: string) =>
    apiRequest<Account>(
      `/workspaces/${workspaceId}/accounts/${accountId}/unarchive`,
      { method: 'POST' }
    ),

  delete: (workspaceId: string, accountId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/accounts/${accountId}`, {
      method: 'DELETE',
    }),

  previewCsvImport: (
    workspaceId: string,
    accountId: string,
    file: UploadFile
  ) =>
    apiRequestUpload<AccountCsvImportPreviewResult>(
      `/workspaces/${workspaceId}/accounts/${accountId}/csv-import/preview`,
      file
    ),

  confirmCsvImport: (
    workspaceId: string,
    accountId: string,
    input: ConfirmAccountCsvImportInput
  ) =>
    apiRequest<ConfirmAccountCsvImportResult>(
      `/workspaces/${workspaceId}/accounts/${accountId}/csv-import/confirm`,
      { method: 'POST', body: input }
    ),
};

export type AccountCsvImportRowStatus = 'new' | 'duplicate' | 'invalid';

/** Espelha AccountCsvImportPreviewRow (backend) — sem installment, ao contrário do import de fatura. */
export interface AccountCsvImportPreviewRow {
  rowIndex: number;
  raw: string[];
  date: string | null;
  description: string | null;
  amount: number | null;
  type: TransactionType | null;
  status: AccountCsvImportRowStatus;
  suggestedCategoryId: string | null;
}

export interface AccountCsvImportPreviewResult {
  delimiter: string;
  headerDetected: boolean;
  rows: AccountCsvImportPreviewRow[];
}

export interface ConfirmAccountCsvImportRow {
  date: string;
  description: string;
  amount: number;
  categoryId: string;
}

export interface ConfirmAccountCsvImportInput {
  method: 'pix' | 'debit' | 'cash';
  rows: ConfirmAccountCsvImportRow[];
}

export interface ConfirmAccountCsvImportResult {
  created: number;
  skippedDuplicates: number;
}
