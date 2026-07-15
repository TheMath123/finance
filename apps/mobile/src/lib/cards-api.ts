import type { InvoiceStatus } from "@finance/shared";

import { apiRequest } from "@/lib/api-client";

export interface Card {
  id: string;
  workspaceId: string;
  bankId: string;
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
  bankId: string;
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
  method: "pix" | "debit";
}

export const cardsApi = {
  list: (workspaceId: string) => apiRequest<Card[]>(`/workspaces/${workspaceId}/cards`),

  create: (workspaceId: string, input: CreateCardInput) =>
    apiRequest<Card>(`/workspaces/${workspaceId}/cards`, { method: "POST", body: input }),

  listInvoices: (workspaceId: string, cardId: string) =>
    apiRequest<Invoice[]>(`/workspaces/${workspaceId}/cards/${cardId}/invoices`),

  payInvoice: (workspaceId: string, invoiceId: string, input: PayInvoiceInput) =>
    apiRequest<void>(`/workspaces/${workspaceId}/invoices/${invoiceId}/pay`, {
      method: "POST",
      body: input,
    }),
};
