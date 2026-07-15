import { eq } from "drizzle-orm";
import { users } from "@finance/db";
import type { CreateUserData, UserRepository } from "../../../application/ports/user-repository";
import type { DbHandle } from "../handle";

export function createUserRepository(db: DbHandle): UserRepository {
  return {
    findByEmail: (email) => db.query.users.findFirst({ where: eq(users.email, email) }),
    findById: (id) => db.query.users.findFirst({ where: eq(users.id, id) }),
    async create(data: CreateUserData) {
      const [row] = await db.insert(users).values(data).returning();
      if (!row) throw new Error("falha ao criar usuário");
      return row;
    },
    async setDefaultWorkspace(userId, workspaceId) {
      await db.update(users).set({ defaultWorkspaceId: workspaceId }).where(eq(users.id, userId));
    },
    async recordLoginFailure(userId, attempts, lockedUntil) {
      await db
        .update(users)
        .set({ failedLoginAttempts: attempts, lockedUntil })
        .where(eq(users.id, userId));
    },
    async resetLock(userId) {
      await db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, userId));
    },
    async updatePassword(userId, passwordHash) {
      await db
        .update(users)
        .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, userId));
    },
    async markEmailVerified(userId) {
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
    },
  };
}
