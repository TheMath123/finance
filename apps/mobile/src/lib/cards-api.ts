import type { InvoiceStatus, TransactionType } from '@finance/shared';

import {
  apiRequest,
  apiRequestUpload,
  type UploadFile,
} from '@/lib/api-client';

export interface Card {
  id: string;
  workspaceId: string;
  /** Código do catálogo (@finance/shared BANK_CATALOG) — usuário não cadastra banco manualmente. */
  bankCode: string;
  name: string;
  /** Centavos. */
  limit: number;
  closingDay: number;
  dueDay: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Centavos — derivado (limit − Σ faturas não pagas), nunca editável direto. */
  availableLimit: number;
}

export interface CreateCardInput {
  name: string;
  bankCode: string;
  /** Centavos. */
  limit: number;
  closingDay: number;
  dueDay: number;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  cardId: string;
  monthReference: number;
  yearReference: number;
  status: InvoiceStatus;
  paymentTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Centavos. */
  total: number;
  /** Mesmo valor de `status` — campo "fonte da verdade" para a UI. */
  effectiveStatus: InvoiceStatus;
}

export interface PayInvoiceInput {
  accountId: string;
  date: string;
  method: 'pix' | 'debit';
}

export const cardsApi = {
  list: (workspaceId: string) =>
    apiRequest<Card[]>(`/workspaces/${workspaceId}/cards`),

  create: (workspaceId: string, input: CreateCardInput) =>
    apiRequest<Card>(`/workspaces/${workspaceId}/cards`, {
      method: 'POST',
      body: input,
    }),

  update: (
    workspaceId: string,
    cardId: string,
    input: Partial<CreateCardInput>
  ) =>
    apiRequest<Card>(`/workspaces/${workspaceId}/cards/${cardId}`, {
      method: 'PATCH',
      body: input,
    }),

  archive: (workspaceId: string, cardId: string) =>
    apiRequest<Card>(`/workspaces/${workspaceId}/cards/${cardId}/archive`, {
      method: 'POST',
    }),

  unarchive: (workspaceId: string, cardId: string) =>
    apiRequest<Card>(`/workspaces/${workspaceId}/cards/${cardId}/unarchive`, {
      method: 'POST',
    }),

  delete: (workspaceId: string, cardId: string) =>
    apiRequest<void>(`/workspaces/${workspaceId}/cards/${cardId}`, {
      method: 'DELETE',
    }),

  listInvoices: (workspaceId: string, cardId: string) =>
    apiRequest<Invoice[]>(
      `/workspaces/${workspaceId}/cards/${cardId}/invoices`
    ),

  payInvoice: (
    workspaceId: string,
    invoiceId: string,
    input: PayInvoiceInput
  ) =>
    apiRequest<void>(`/workspaces/${workspaceId}/invoices/${invoiceId}/pay`, {
      method: 'POST',
      body: input,
    }),

  undoPayment: (workspaceId: string, invoiceId: string) =>
    apiRequest<void>(
      `/workspaces/${workspaceId}/invoices/${invoiceId}/undo-payment`,
      { method: 'POST' }
    ),

  previewCsvImport: (
    workspaceId: string,
    cardId: string,
    file: UploadFile,
    month: number,
    year: number
  ) =>
    apiRequestUpload<CsvImportPreviewResult>(
      `/workspaces/${workspaceId}/cards/${cardId}/csv-import/preview`,
      file,
      { month: String(month), year: String(year) }
    ),

  confirmCsvImport: (
    workspaceId: string,
    cardId: string,
    input: ConfirmCsvImportInput
  ) =>
    apiRequest<ConfirmCsvImportResult>(
      `/workspaces/${workspaceId}/cards/${cardId}/csv-import/confirm`,
      { method: 'POST', body: input }
    ),
};

/** Espelha CsvImportRowInstallment (backend, use-cases/card/preview-invoice-csv-import.ts). */
export interface CsvImportRowInstallment {
  number: number;
  total: number;
}

export type CsvImportRowStatus = 'new' | 'duplicate' | 'invalid';

/** Espelha CsvImportPreviewRow (backend). */
export interface CsvImportPreviewRow {
  rowIndex: number;
  raw: string[];
  date: string | null;
  description: string | null;
  amount: number | null;
  type: TransactionType | null;
  status: CsvImportRowStatus;
  installment: CsvImportRowInstallment | null;
  suggestedCategoryId: string | null;
}

export interface CsvImportPreviewResult {
  delimiter: string;
  headerDetected: boolean;
  rows: CsvImportPreviewRow[];
}

export interface ConfirmCsvImportRow {
  date: string;
  description: string;
  amount: number;
  categoryId: string;
  installment: CsvImportRowInstallment | null;
}

export interface ConfirmCsvImportInput {
  month: number;
  year: number;
  rows: ConfirmCsvImportRow[];
}

export interface ConfirmCsvImportResult {
  created: number;
  skippedDuplicates: number;
  skippedPaidInvoice: number;
}
