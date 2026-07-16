import type { RecurrenceFrequency, TransactionType } from "@finance/shared";
import type { RecurringTransaction } from "../../domain/entities/recurring-transaction";

export interface CreateRecurringData {
  description: string;
  amount: number;
  type: TransactionType;
  method: "pix" | "debit" | "cash" | "credit";
  categoryId: string;
  accountId?: string | null;
  cardId?: string | null;
  frequency: RecurrenceFrequency;
  dayOfReference: number;
  monthOfReference?: number | null;
  active?: boolean;
}

export interface RecurringRepository {
  create(workspaceId: string, data: CreateRecurringData): Promise<RecurringTransaction>;
  findInWorkspace(workspaceId: string, id: string): Promise<RecurringTransaction | undefined>;
  listByWorkspace(workspaceId: string): Promise<RecurringTransaction[]>;
  listActive(workspaceId: string): Promise<RecurringTransaction[]>;
  /** Sweep de notificação (sistema inteiro, não por workspace). */
  listAllActive(): Promise<RecurringTransaction[]>;
  update(id: string, patch: Partial<CreateRecurringData>): Promise<RecurringTransaction>;
  delete(id: string): Promise<void>;
}
