import type { SplitShareStatus } from '@finance/shared';

export interface ExpenseSplit {
  id: string;
  transactionId: string;
  createdBy: string;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SplitShare {
  id: string;
  splitId: string;
  participantUserId: string | null;
  participantName: string | null;
  /** Centavos. */
  amount: number;
  status: SplitShareStatus;
  reimbursementTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
