import type { InterUserTransferStatus } from "@finance/shared";

export interface InterUserTransfer {
  id: string;
  fromUserId: string;
  fromTransactionId: string;
  toUserId: string;
  toTransactionId: string | null;
  /** Centavos. */
  amount: number;
  description: string;
  status: InterUserTransferStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrustedContact {
  id: string;
  userId: string;
  trustedUserId: string;
  defaultAccountId: string;
  createdAt: Date;
}
