/**
 * Testes do fluxo completo de auth contra o Postgres local (docker compose).
 * O dispatcher é fake: captura os jobs para extrair tokens de e-mail.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDb, categories, refreshTokens, workspaceMembers, banks, bankAccounts, type Db } from "@finance/db";
import { createTestDeps, type DispatchedJob } from "../../../test/deps";
import {
  forgotPassword,
  login,
  refresh,
  logout,
  me,
  register,
  resetPassword,
  verifyEmail,
} from ".";

function extractToken(url: string): string {
  return new URL(url).searchParams.get("token") ?? "";
}

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

describe("auth: registro", () => {
  test("cria usuário, workspace pessoal, membership owner e categorias padrão", async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();

    const result = await register(deps, {
      name: "Teste",
      email,
      password: "senha-forte-123",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.accessToken).toBeTruthy();
    expect(result.value.refreshToken).toBeTruthy();

    const members = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, result.value.defaultWorkspaceId));
    expect(members).toHaveLength(1);
    expect(members[0]?.role).toBe("owner");

    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.workspaceId, result.value.defaultWorkspaceId));
    expect(cats.length).toBeGreaterThanOrEqual(9);
    expect(cats.some((c) => c.isFallback)).toBe(true);

    expect(jobs.some((j) => j.name === "email.verify-email")).toBe(true);
  });

  test("cria banco e conta padrão", async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();

    const result = await register(deps, { name: "Teste", email, password: "senha-forte-123" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const workspaceBanks = await db
      .select()
      .from(banks)
      .where(eq(banks.workspaceId, result.value.defaultWorkspaceId));
    expect(workspaceBanks).toHaveLength(1);

    const workspaceAccounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.workspaceId, result.value.defaultWorkspaceId));
    expect(workspaceAccounts).toHaveLength(1);
    expect(workspaceAccounts[0]?.bankId).toBe(workspaceBanks[0]?.id);
  });

  test("rejeita e-mail duplicado", async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const input = { name: "A", email, password: "senha-forte-123" };

    expect((await register(deps, input)).ok).toBe(true);
    const second = await register(deps, input);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("email_taken");
  });
});

describe("auth: login e refresh", () => {
  test("login com credenciais válidas; senha errada falha", async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    await register(deps, { name: "B", email, password: "senha-forte-123" });

    const ok = await login(deps, { email, password: "senha-forte-123" });
    expect(ok.ok).toBe(true);

    const bad = await login(deps, { email, password: "senha-errada-000" });
    expect(bad.ok).toBe(false);
  });

  test("refresh rotaciona: o token antigo deixa de valer", async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, { name: "C", email, password: "senha-forte-123" });
    if (!session.ok) throw new Error("registro falhou");

    const first = await refresh(deps, { refreshToken: session.value.refreshToken });
    expect(first.ok).toBe(true);

    // Reuso do token antigo deve falhar (rotação)
    const reuse = await refresh(deps, { refreshToken: session.value.refreshToken });
    expect(reuse.ok).toBe(false);
  });

  test("logout revoga o refresh token", async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, { name: "D", email, password: "senha-forte-123" });
    if (!session.ok) throw new Error("registro falhou");

    await logout(deps, { refreshToken: session.value.refreshToken });
    const after = await refresh(deps, { refreshToken: session.value.refreshToken });
    expect(after.ok).toBe(false);
  });

  test("me retorna os dados do usuário autenticado", async () => {
    const deps = createTestDeps(db);
    const email = uniqueEmail();
    const session = await register(deps, { name: "E", email, password: "senha-forte-123" });
    if (!session.ok) throw new Error("registro falhou");

    const result = await me(deps, session.value.user.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.email).toBe(email);
    expect(result.value.defaultWorkspaceId).toBe(session.value.defaultWorkspaceId);
  });
});

describe("auth: verificação de e-mail e reset de senha", () => {
  test("fluxo completo: verificar e-mail → forgot → reset → sessões revogadas → login com nova senha", async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();

    const session = await register(deps, { name: "E", email, password: "senha-original-123" });
    if (!session.ok) throw new Error("registro falhou");

    // forgot antes de verificar e-mail: resposta genérica, MAS sem e-mail enviado
    await forgotPassword(deps, { email });
    expect(jobs.filter((j) => j.name === "email.password-reset")).toHaveLength(0);

    // verifica o e-mail com o token capturado do job
    const verifyJob = jobs.find((j) => j.name === "email.verify-email");
    if (!verifyJob) throw new Error("job de verificação não disparado");
    const verifyToken = extractToken((verifyJob.payload as { verifyUrl: string }).verifyUrl);
    expect((await verifyEmail(deps, { token: verifyToken })).ok).toBe(true);
    // token de verificação é single-use
    expect((await verifyEmail(deps, { token: verifyToken })).ok).toBe(false);

    // agora o forgot envia o e-mail de reset
    await forgotPassword(deps, { email });
    const resetJob = jobs.find((j) => j.name === "email.password-reset");
    if (!resetJob) throw new Error("job de reset não disparado");
    const resetToken = extractToken((resetJob.payload as { resetUrl: string }).resetUrl);

    const reset = await resetPassword(deps, { token: resetToken, password: "senha-nova-456" });
    expect(reset.ok).toBe(true);

    // reset é single-use
    expect((await resetPassword(deps, { token: resetToken, password: "outra-789xx" })).ok).toBe(
      false,
    );

    // todas as sessões foram revogadas
    const remaining = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, session.value.user.id));
    expect(remaining).toHaveLength(0);

    // senha antiga não funciona; nova funciona
    expect((await login(deps, { email, password: "senha-original-123" })).ok).toBe(false);
    expect((await login(deps, { email, password: "senha-nova-456" })).ok).toBe(true);

    // e-mail de "senha alterada" foi disparado
    expect(jobs.some((j) => j.name === "email.password-changed")).toBe(true);
  });

  test("token de reset inválido falha", async () => {
    const deps = createTestDeps(db);
    const result = await resetPassword(deps, { token: "token-inexistente", password: "12345678" });
    expect(result.ok).toBe(false);
  });
});

describe("auth: lockout progressivo", () => {
  test("5 falhas travam a conta (mesmo com a senha certa), e-mail de aviso é disparado e o reset destrava", async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const email = uniqueEmail();
    await register(deps, { name: "L", email, password: "senha-certa-123" });

    for (let i = 0; i < 5; i++) {
      const attempt = await login(deps, { email, password: "senha-errada-000" });
      expect(attempt.ok).toBe(false);
    }
    // e-mail de atividade suspeita disparado no lockout
    expect(jobs.some((j) => j.name === "email.account-locked")).toBe(true);

    // conta travada: senha CERTA também falha, com o mesmo erro genérico
    const locked = await login(deps, { email, password: "senha-certa-123" });
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.error).toBe("invalid_credentials");

    // reset de senha zera o lockout: verifica e-mail, pede reset e redefine
    const verifyJob = jobs.find((j) => j.name === "email.verify-email");
    if (!verifyJob) throw new Error("job de verificação não disparado");
    const verifyToken = extractToken((verifyJob.payload as { verifyUrl: string }).verifyUrl);
    expect((await verifyEmail(deps, { token: verifyToken })).ok).toBe(true);
    await forgotPassword(deps, { email });
    const resetJob = jobs.find((j) => j.name === "email.password-reset");
    if (!resetJob) throw new Error("job de reset não disparado");
    const resetToken = extractToken((resetJob.payload as { resetUrl: string }).resetUrl);
    expect((await resetPassword(deps, { token: resetToken, password: "senha-nova-456" })).ok).toBe(
      true,
    );

    // destravada: login com a nova senha funciona imediatamente
    expect((await login(deps, { email, password: "senha-nova-456" })).ok).toBe(true);
  });
});
