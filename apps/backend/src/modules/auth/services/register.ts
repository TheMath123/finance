import { eq } from "drizzle-orm";
import {
  DEFAULT_CATEGORIES,
  authTokens,
  categories,
  users,
  workspaceMembers,
  workspaces,
  type User,
} from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { AppDeps } from "../../../lib/deps";
import { VERIFY_EMAIL_TOKEN_TTL_MS, generateOpaqueToken } from "../../../lib/tokens";
import type { RegisterInput } from "../schemas";
import type { AuthError } from "../errors";
import { BCRYPT, issueSession, type AuthSession } from "./shared";

export async function register(
  deps: AppDeps,
  input: RegisterInput,
): Promise<Either<AuthError, AuthSession>> {
  const existing = await deps.db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) return left("email_taken");

  const passwordHash = await Bun.password.hash(input.password, BCRYPT);

  let created: { user: User; workspace: { id: string } };
  try {
    created = await deps.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
          termsAcceptedAt: new Date(),
          termsVersion: deps.termsVersion,
        })
        .returning();
      if (!user) throw new Error("falha ao criar usuário");

      const [workspace] = await tx
        .insert(workspaces)
        .values({ name: "Pessoal", type: "personal" })
        .returning();
      if (!workspace) throw new Error("falha ao criar workspace");

      await tx
        .update(users)
        .set({ defaultWorkspaceId: workspace.id })
        .where(eq(users.id, user.id));
      await tx
        .insert(workspaceMembers)
        .values({ workspaceId: workspace.id, userId: user.id, role: "owner" });
      await tx.insert(categories).values(
        DEFAULT_CATEGORIES.map((c) => ({
          workspaceId: workspace.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          isFallback: c.isFallback ?? false,
        })),
      );
      return { user, workspace };
    });
  } catch (error) {
    // Corrida: dois registros simultâneos do mesmo e-mail — o unique index decide
    if ((error as { code?: string }).code === "23505") return left("email_taken");
    throw error;
  }
  const { user, workspace } = created;

  const verify = generateOpaqueToken();
  await deps.db.insert(authTokens).values({
    userId: user.id,
    purpose: "email_verification",
    tokenHash: verify.hash,
    expiresAt: new Date(Date.now() + VERIFY_EMAIL_TOKEN_TTL_MS),
  });
  await deps.dispatch("email.verify-email", {
    to: user.email,
    name: user.name,
    verifyUrl: `${deps.appUrl}/verify-email?token=${verify.raw}`,
  });

  return right(await issueSession(deps, user, workspace.id));
}
