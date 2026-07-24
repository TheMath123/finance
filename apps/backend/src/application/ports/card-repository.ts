import type { Card } from '../../domain/entities/card';

export interface CreateCardData {
  name: string;
  bankId: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

export interface CardRepository {
  create(workspaceId: string, data: CreateCardData): Promise<Card>;
  findInWorkspace(
    workspaceId: string,
    cardId: string
  ): Promise<Card | undefined>;
  findActiveInWorkspace(
    workspaceId: string,
    cardId: string
  ): Promise<Card | undefined>;
  listByWorkspace(workspaceId: string): Promise<Card[]>;
  update(cardId: string, patch: Partial<CreateCardData>): Promise<Card>;
  setArchived(cardId: string, archived: boolean): Promise<Card>;
  delete(cardId: string): Promise<void>;
  existsByBank(bankId: string): Promise<boolean>;
}
