import { DEFAULT_CATEGORIES } from "@finance/db";
import { left, right, type Either } from "@finance/shared";
import type { User } from "../../../domain/entities/user";
import type { UseCaseDeps } from "../../deps";
import { isUniqueConstraintError } from "../../errors";
import { VERIFY_EMAIL_TOKEN_TTL_MS } from "../../../infra/security/jose-token-service";
import type { AuthError } from "./errors";
import { issueSession, type AuthSession } from "./session";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function register(
  deps: UseCaseDeps,
  input: RegisterInput,
): Promise<Either<AuthError, AuthSession>> {
  const existing = await deps.repos.user.findByEmail(input.email);
  if (existing) return left("email_taken");

  const passwordHash = await deps.hasher.hash(input.password);

  let created: { user: User; workspaceId: string };
  try {
    created = await deps.uow.run(async (repos) => {
      const user = await repos.user.create({
        name: input.name,
        email: input.email,
        passwordHash,
        termsAcceptedAt: new Date(),
        termsVersion: deps.termsVersion,
      });

      const workspace = await repos.workspace.create({ name: "Pessoal", type: "personal" });
      await repos.user.setDefaultWorkspace(user.id, workspace.id);
      await repos.workspace.addMember({ workspaceId: workspace.id, userId: user.id, role: "owner" });
      await repos.category.createMany(
        workspace.id,
        DEFAULT_CATEGORIES.map((c) => ({
          name: c.name,
          icon: c.icon,
          color: c.color,
          isFallback: c.isFallback ?? false,
          isDefault: true,
        })),
      );

      // Banco + conta padrão — usuário começa com algo pra lançar transação sem
      // precisar cadastrar banco/conta manualmente primeiro.
      const bank = await repos.bank.create(workspace.id, { name: "Minha carteira", bankCode: "other" });
      await repos.account.create(workspace.id, {
        name: "Conta principal",
        bankId: bank.id,
        type: "checking",
        initialBalance: 0,
      });

      return { user, workspaceId: workspace.id };
    });
  } catch (error) {
    // Corrida: dois registros simultâneos do mesmo e-mail — o unique index decide
    if (isUniqueConstraintError(error)) return left("email_taken");
    throw error;
  }
  const { user, workspaceId } = created;

  const verify = deps.tokens.generateOpaque();
  await deps.repos.token.createAuthToken({
    userId: user.id,
    purpose: "email_verification",
    tokenHash: verify.hash,
    expiresAt: new Date(Date.now() + VERIFY_EMAIL_TOKEN_TTL_MS),
  });
  await deps.dispatch("email.verify-email", {
    to: user.email,
    name: user.name,
    code: verify.raw,
  });

  return right(await issueSession(deps, user, workspaceId));
}
