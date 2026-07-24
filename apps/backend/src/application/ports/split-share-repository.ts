import type { SplitShareStatus } from '@finance/shared';
import type { SplitShare } from '../../domain/entities/expense-split';

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
  /** Null = participante externo (sem conta). Usado pra saber quando "confirmar recebimento" é válido (ver confirm-reimbursement.ts). */
  participantUserId: string | null;
}

export interface SplitShareRepository {
  createMany(shares: CreateSplitShareData[]): Promise<SplitShare[]>;
  findById(id: string): Promise<SplitShare | undefined>;
  listBySplit(splitId: string): Promise<SplitShare[]>;
  /** Condicional (`WHERE status=fromStatus`) — `undefined` se o share já mudou de estado por outra chamada (corrida). */
  updateStatus(
    id: string,
    fromStatus: SplitShareStatus,
    toStatus: SplitShareStatus,
    reimbursementTransactionId?: string
  ): Promise<SplitShare | undefined>;
  /** O que o usuário deve — participante (platform user) em shares ainda não confirmadas. */
  listOwedByUser(userId: string): Promise<OwedByMeView[]>;
  /** O que devem ao usuário — shares de splits criados por ele, ainda não confirmadas. */
  listOwedToCreator(creatorId: string): Promise<OwedToMeView[]>;
}
