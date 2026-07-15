export interface Bank {
  id: string;
  workspaceId: string;
  name: string;
  bankCode: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
