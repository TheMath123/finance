import type { User } from '../../domain/entities/user';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  termsAcceptedAt: Date;
  termsVersion: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  /** Vínculo do WhatsApp (M2) — resolve o remetente de uma mensagem a um usuário. */
  findByPhone(phone: string): Promise<User | undefined>;
  create(data: CreateUserData): Promise<User>;
  setDefaultWorkspace(userId: string, workspaceId: string): Promise<void>;
  recordLoginFailure(
    userId: string,
    attempts: number,
    lockedUntil: Date | null
  ): Promise<void>;
  resetLock(userId: string): Promise<void>;
  /** Também zera o lockout (regra do spec). */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  /** Vínculo/revogação do WhatsApp (M2) — `null` revoga. */
  updatePhone(userId: string, phone: string | null): Promise<void>;
  /** Exclusão de conta (LGPD). Cascata via FK cuida de refresh_tokens e workspace_members. */
  delete(userId: string): Promise<void>;
  /** Edição de perfil: troca de nome (sem confirmação extra, spec do perfil). */
  updateName(userId: string, name: string): Promise<void>;
  /** Marca o e-mail novo aguardando confirmação por código — `null` cancela um pedido pendente. */
  setPendingEmail(userId: string, email: string | null): Promise<void>;
  /**
   * Confirma a troca: vira o `email` de vez, limpa `pendingEmail` e marca
   * `emailVerifiedAt = now()` (o e-mail novo acabou de ser provado pelo código).
   */
  applyEmailChange(userId: string, newEmail: string): Promise<void>;
  /** Suspensão administrativa (M4-08, superadmin) — bloqueia login até reativar. */
  suspend(userId: string): Promise<void>;
  reactivate(userId: string): Promise<void>;
  /** Listagem paginada pro painel de superadmin — busca por nome ou e-mail. */
  listAll(params: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ users: User[]; total: number }>;
}
