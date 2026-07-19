import type { SplitShareStatus } from "@finance/shared";
import type { SplitShare } from "../../domain/entities/expense-split";

export interface CreateSplitShareData {
  splitId: string;
  participantUserId?: string | null;
  participantName?: string | null;
  amount: number;
}

export interface OwedByMeView {
  shareId: string;
  splitId: string;
  amount: number;
  status: SplitShareStatus;
  transactionDescription: string;
  creatorName: string;
}

export interface OwedToMeView {
  shareId: string;
  splitId: string;
  amount: number;
  status: SplitShareStatus;
  transactionDescription: string;
  participantName: string;
}

export interface SplitShareRepository {
  createMany(shares: CreateSplitShareData[]): Promise<SplitShare[]>;
  findById(id: string): Promise<SplitShare | undefined>;
  listBySplit(splitId: string): Promise<SplitShare[]>;
  updateStatus(id: string, status: SplitShareStatus, reimbursementTransactionId?: string): Promise<SplitShare>;
  /** O que o usuário deve — participante (platform user) em shares ainda não confirmadas. */
  listOwedByUser(userId: string): Promise<OwedByMeView[]>;
  /** O que devem ao usuário — shares de splits criados por ele, ainda não confirmadas. */
  listOwedToCreator(creatorId: string): Promise<OwedToMeView[]>;
}
