import type { InterUserTransferStatus } from "@finance/shared";
import type { InterUserTransfer } from "../../domain/entities/inter-user-transfer";

export interface CreateInterUserTransferData {
  fromUserId: string;
  fromTransactionId: string;
  toUserId: string;
  amount: number;
  description: string;
  expiresAt: Date;
  /** "accepted" direto quando o remetente já é contato confiável do destinatário — pula o pending. */
  status: InterUserTransferStatus;
  toTransactionId?: string | null;
}

export interface InterUserTransferRepository {
  create(data: CreateInterUserTransferData): Promise<InterUserTransfer>;
  findById(id: string): Promise<InterUserTransfer | undefined>;
  /** Recebidas, aguardando aceite/recusa. */
  listPendingForUser(userId: string): Promise<InterUserTransfer[]>;
  /** Condicional (`WHERE status='pending'`) — `undefined` se outra chamada já finalizou primeiro (corrida). */
  accept(id: string, toTransactionId: string): Promise<InterUserTransfer | undefined>;
  /** Idem — condicional, `undefined` se já finalizado. */
  reject(id: string): Promise<InterUserTransfer | undefined>;
  /** Pendentes vencidas — varredura do sweep diário. */
  listExpired(now: Date): Promise<InterUserTransfer[]>;
  markExpired(id: string): Promise<void>;
}
