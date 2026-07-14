import { and, eq, gt, isNull } from "drizzle-orm";
import {
  DEFAULT_CATEGORIES,
  authTokens,
  categories,
  refreshTokens,
  users,
  workspaceMembers,
  workspaces,
  type Db,
  type User,
} from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { QueueDispatcher } from "@finance/queues";
import {
  REFRESH_TOKEN_TTL_MS,
  RESET_TOKEN_TTL_MS,
  VERIFY_EMAIL_TOKEN_TTL_MS,
  generateOpaqueToken,
  hashToken,
  signAccessToken,
} from "../../lib/tokens";
import type {
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./schemas";

export type AuthError = "email_taken" | "invalid_credentials" | "invalid_token";

export interface AuthDeps {
  db: Db;
  dispatch: QueueDispatcher["dispatch"];
  jwtSecret: string;
  appUrl: string;
  termsVersion: string;
}

export interface AuthSession {
  user: { id: string; name: string; email: string };
  defaultWorkspaceId: string;
  accessToken: string;
  refreshToken: string;
}

const BCRYPT = { algorithm: "bcrypt", cost: 12 } as const;

async function issueSession(deps: AuthDeps, user: User, workspaceId: string): Promise<AuthSession> {
  const refresh = generateOpaqueToken();
  await deps.db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refresh.hash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return {
    user: { id: user.id, name: user.name, email: user.email },
    defaultWorkspaceId: workspaceId,
    accessToken: await signAccessToken(deps.jwtSecret, user.id),
    refreshToken: refresh.raw,
  };
}

export async function register(
  deps: AuthDeps,
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

    await tx.update(users).set({ defaultWorkspaceId: workspace.id }).where(eq(users.id, user.id));
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

export async function login(
  deps: AuthDeps,
  input: LoginInput,
): Promise<Either<AuthError, AuthSession>> {
  const user = await deps.db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!user) {
    // Compara contra hash dummy para não vazar existência de conta pelo tempo de resposta
    await Bun.password.verify(input.password, await Bun.password.hash("dummy", BCRYPT));
    return left("invalid_credentials");
  }
  const valid = await Bun.password.verify(input.password, user.passwordHash);
  if (!valid) return left("invalid_credentials");
  if (!user.defaultWorkspaceId) return left("invalid_credentials");

  return right(await issueSession(deps, user, user.defaultWorkspaceId));
}

export async function refresh(
  deps: AuthDeps,
  input: RefreshInput,
): Promise<Either<AuthError, AuthSession>> {
  const tokenHash = hashToken(input.refreshToken);
  const stored = await deps.db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.tokenHash, tokenHash),
  });
  if (!stored) return left("invalid_token");

  // Rotação: o token usado é sempre invalidado, válido ou expirado
  await deps.db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
  if (stored.expiresAt.getTime() <= Date.now()) return left("invalid_token");

  const user = await deps.db.query.users.findFirst({ where: eq(users.id, stored.userId) });
  if (!user || !user.defaultWorkspaceId) return left("invalid_token");

  return right(await issueSession(deps, user, user.defaultWorkspaceId));
}

export async function logout(deps: AuthDeps, input: RefreshInput): Promise<Either<never, null>> {
  await deps.db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hashToken(input.refreshToken)));
  return right(null);
}

/** Sempre retorna sucesso — não revela se o e-mail existe (OWASP). */
export async function forgotPassword(
  deps: AuthDeps,
  input: ForgotPasswordInput,
): Promise<Either<never, null>> {
  const user = await deps.db.query.users.findFirst({ where: eq(users.email, input.email) });
  // Reset exige e-mail verificado (spec: Segurança > Cadastro)
  if (!user || !user.emailVerifiedAt) return right(null);

  // Gerar novo token invalida os anteriores não usados
  await deps.db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.userId, user.id),
        eq(authTokens.purpose, "password_reset"),
        isNull(authTokens.usedAt),
      ),
    );

  const reset = generateOpaqueToken();
  await deps.db.insert(authTokens).values({
    userId: user.id,
    purpose: "password_reset",
    tokenHash: reset.hash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  await deps.dispatch("email.password-reset", {
    to: user.email,
    name: user.name,
    resetUrl: `${deps.appUrl}/reset-password?token=${reset.raw}`,
  });
  return right(null);
}

export async function resetPassword(
  deps: AuthDeps,
  input: ResetPasswordInput,
): Promise<Either<AuthError, null>> {
  const stored = await deps.db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, hashToken(input.token)),
      eq(authTokens.purpose, "password_reset"),
      isNull(authTokens.usedAt),
      gt(authTokens.expiresAt, new Date()),
    ),
  });
  if (!stored) return left("invalid_token");

  const passwordHash = await Bun.password.hash(input.password, BCRYPT);
  await deps.db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, stored.userId));
    await tx.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, stored.id));
    // Revoga todas as sessões (OWASP)
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, stored.userId));
  });

  const user = await deps.db.query.users.findFirst({ where: eq(users.id, stored.userId) });
  if (user) {
    await deps.dispatch("email.password-changed", { to: user.email, name: user.name });
  }
  return right(null);
}

export async function verifyEmail(
  deps: AuthDeps,
  input: VerifyEmailInput,
): Promise<Either<AuthError, null>> {
  const stored = await deps.db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, hashToken(input.token)),
      eq(authTokens.purpose, "email_verification"),
      isNull(authTokens.usedAt),
      gt(authTokens.expiresAt, new Date()),
    ),
  });
  if (!stored) return left("invalid_token");

  await deps.db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, stored.userId));
    await tx.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, stored.id));
  });
  return right(null);
}
