import type { InvoiceStatus } from "@finance/shared";

export interface Card {
  id: string;
  workspaceId: string;
  bankId: string;
  name: string;
  /** Centavos. Limite disponível = limit − Σ(faturas não pagas) — derivado. */
  limit: number;
  closingDay: number;
  dueDay: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardInvoice {
  id: string;
  workspaceId: string;
  cardId: string;
  monthReference: number;
  yearReference: number;
  status: InvoiceStatus;
  paymentTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
