/**
 * Testes do módulo de workspaces compartilhados (M2-02) contra o Postgres local:
 * criação de workspace family, convites (criar/aceitar/revogar) e regra de
 * sucessão de owner (mudança de papel e remoção/saída de membro).
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { bankAccounts, banks, categories, createDb, workspaceInvites, workspaces, type Db } from "@finance/db";
import type { Actor } from "../../deps";
import { createTestDeps } from "../../../test/deps";
import { deleteAccount, register } from "../auth";
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  listMyInvites,
  listMyWorkspaces,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from ".";

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

/** Registra um usuário novo e devolve o Actor dele no próprio workspace pessoal (sempre owner). */
async function newOwnerActor(): Promise<{ actor: Actor; email: string; name: string }> {
  const deps = createTestDeps(db);
  const email = uniqueEmail();
  const name = `Dono ${crypto.randomUUID().slice(0, 8)}`;
  const result = await register(deps, { name, email, password: "senha-forte-123" });
  if (!result.ok) throw new Error("falha ao registrar usuário de teste");
  return {
    actor: { userId: result.value.user.id, workspaceId: result.value.defaultWorkspaceId, role: "owner" },
    email,
    name,
  };
}

describe("workspace: criação", () => {
  test("cria workspace family e o criador vira owner", async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();

    const workspace = await createWorkspace(deps, actor.userId, { name: "Família Teste" });
    expect(workspace.type).toBe("family");

    const mine = await listMyWorkspaces(deps, actor.userId);
    expect(mine.some((w) => w.id === workspace.id && w.role === "owner")).toBe(true);
  });

  test("já nasce com categorias padrão, banco e conta zerada (mesmo onboarding do registro)", async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();
    const workspace = await createWorkspace(deps, actor.userId, { name: "Família com Onboarding" });

    const cats = await db.select().from(categories).where(eq(categories.workspaceId, workspace.id));
    expect(cats.length).toBeGreaterThanOrEqual(9);
    expect(cats.some((c) => c.isFallback)).toBe(true);

    const workspaceBanks = await db.select().from(banks).where(eq(banks.workspaceId, workspace.id));
    expect(workspaceBanks).toHaveLength(1);

    const workspaceAccounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.workspaceId, workspace.id));
    expect(workspaceAccounts).toHaveLength(1);
    expect(workspaceAccounts[0]?.initialBalance).toBe(0);
    expect(workspaceAccounts[0]?.bankId).toBe(workspaceBanks[0]?.id);
  });
});

describe("workspace: convites", () => {
  test("convida por e-mail, o convidado aceita e vira membro", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família A" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();

    const invite = await createInvite(deps, familyOwner, { emailOrPhone: memberEmail, role: "member" });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const pending = await listMyInvites(deps, memberActor.userId);
    expect(pending.some((i) => i.id === invite.value.id)).toBe(true);

    const accepted = await acceptInvite(deps, memberActor.userId, invite.value.id);
    expect(accepted.ok).toBe(true);

    const mine = await listMyWorkspaces(deps, memberActor.userId);
    expect(mine.some((w) => w.id === family.id && w.role === "member")).toBe(true);
  });

  test("convite pra e-mail que já é membro falha com already_member", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor, email: ownerEmail } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família B" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const invite = await createInvite(deps, familyOwner, { emailOrPhone: ownerEmail, role: "member" });
    expect(invite.ok).toBe(false);
    if (invite.ok) return;
    expect(invite.error).toBe("already_member");
  });

  test("aceitar convite de outro usuário falha com invite_forbidden", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família C" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { email: invitedEmail } = await newOwnerActor();
    const { actor: strangerActor } = await newOwnerActor();

    const invite = await createInvite(deps, familyOwner, { emailOrPhone: invitedEmail, role: "member" });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const result = await acceptInvite(deps, strangerActor.userId, invite.value.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invite_forbidden");
  });

  test("revogar convite pendente impede aceite depois", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família D" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, { emailOrPhone: memberEmail, role: "member" });
    expect(invite.ok).toBe(true);
    if (!invite.ok) return;

    const revoked = await revokeInvite(deps, ownerActor.userId, invite.value.id);
    expect(revoked.ok).toBe(true);

    const accepted = await acceptInvite(deps, memberActor.userId, invite.value.id);
    expect(accepted.ok).toBe(false);
    if (accepted.ok) return;
    expect(accepted.error).toBe("invite_not_pending");
  });
});

describe("workspace: regra de sucessão de owner", () => {
  test("único owner não pode ser rebaixado nem sair", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família E" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const demoted = await updateMemberRole(deps, familyOwner, { userId: ownerActor.userId, role: "admin" });
    expect(demoted.ok).toBe(false);
    if (!demoted.ok) expect(demoted.error).toBe("sole_owner_cannot_be_demoted");

    const left = await removeMember(deps, familyOwner, ownerActor.userId);
    expect(left.ok).toBe(false);
    if (!left.ok) expect(left.error).toBe("sole_owner_cannot_leave");
  });

  test("com dois owners, um deles pode ser rebaixado ou sair", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família F" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { actor: secondActor, email: secondEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, { emailOrPhone: secondEmail, role: "member" });
    if (!invite.ok) throw new Error("convite falhou");
    await acceptInvite(deps, secondActor.userId, invite.value.id);

    const promoted = await updateMemberRole(deps, familyOwner, { userId: secondActor.userId, role: "owner" });
    expect(promoted.ok).toBe(true);

    const secondAsOwner: Actor = { userId: secondActor.userId, workspaceId: family.id, role: "owner" };
    const demoted = await updateMemberRole(deps, secondAsOwner, { userId: ownerActor.userId, role: "admin" });
    expect(demoted.ok).toBe(true);
  });

  test("member comum pode sair sozinho; admin pode remover outro membro", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família G" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, { emailOrPhone: memberEmail, role: "member" });
    if (!invite.ok) throw new Error("convite falhou");
    await acceptInvite(deps, memberActor.userId, invite.value.id);

    const memberAsSelf: Actor = { userId: memberActor.userId, workspaceId: family.id, role: "member" };
    const left = await removeMember(deps, memberAsSelf, memberActor.userId);
    expect(left.ok).toBe(true);

    // Convida de novo pra testar remoção feita pelo admin (em vez de saída voluntária)
    const invite2 = await createInvite(deps, familyOwner, { emailOrPhone: memberEmail, role: "member" });
    if (!invite2.ok) throw new Error("convite falhou");
    await acceptInvite(deps, memberActor.userId, invite2.value.id);

    const kicked = await removeMember(deps, familyOwner, memberActor.userId);
    expect(kicked.ok).toBe(true);
  });

  test("member comum não pode remover outro membro", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família H" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { actor: memberActor, email: memberEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, { emailOrPhone: memberEmail, role: "member" });
    if (!invite.ok) throw new Error("convite falhou");
    await acceptInvite(deps, memberActor.userId, invite.value.id);

    const memberAsSelf: Actor = { userId: memberActor.userId, workspaceId: family.id, role: "member" };
    const result = await removeMember(deps, memberAsSelf, ownerActor.userId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("forbidden");
  });
});

describe("workspace: exclusão de conta (LGPD) com workspaces compartilhados", () => {
  test("único owner: o workspace family é apagado junto com a conta", async () => {
    const deps = createTestDeps(db);
    const { actor } = await newOwnerActor();
    const family = await createWorkspace(deps, actor.userId, { name: "Família Solo" });

    const result = await deleteAccount(deps, { userId: actor.userId, password: "senha-forte-123" });
    expect(result.ok).toBe(true);

    expect(await db.query.workspaces.findFirst({ where: eq(workspaces.id, family.id) })).toBeUndefined();
  });

  test("com outro owner: o workspace continua existindo, só a membership some", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família Compartilhada" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { actor: secondActor, email: secondEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, { emailOrPhone: secondEmail, role: "member" });
    if (!invite.ok) throw new Error("convite falhou");
    await acceptInvite(deps, secondActor.userId, invite.value.id);
    await updateMemberRole(deps, familyOwner, { userId: secondActor.userId, role: "owner" });

    const result = await deleteAccount(deps, { userId: ownerActor.userId, password: "senha-forte-123" });
    expect(result.ok).toBe(true);

    expect(await db.query.workspaces.findFirst({ where: eq(workspaces.id, family.id) })).toBeDefined();
    const remainingRole = await deps.repos.workspace.getMemberRole(family.id, secondActor.userId);
    expect(remainingRole).toBe("owner");
  });

  test("convite enviado por quem excluiu a conta fica com invited_by nulo (sem quebrar a exclusão)", async () => {
    const deps = createTestDeps(db);
    const { actor: ownerActor } = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família com Convite" });
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.id, role: "owner" };

    const { actor: secondActor, email: secondEmail } = await newOwnerActor();
    const invite = await createInvite(deps, familyOwner, { emailOrPhone: secondEmail, role: "member" });
    if (!invite.ok) throw new Error("convite falhou");
    await acceptInvite(deps, secondActor.userId, invite.value.id);
    // Dois owners agora — o primeiro pode excluir a conta sem apagar o workspace nem travar na FK do convite.
    await updateMemberRole(deps, familyOwner, { userId: secondActor.userId, role: "owner" });

    const result = await deleteAccount(deps, { userId: ownerActor.userId, password: "senha-forte-123" });
    expect(result.ok).toBe(true);

    const row = await db.query.workspaceInvites.findFirst({ where: eq(workspaceInvites.id, invite.value.id) });
    expect(row?.invitedBy).toBeNull();
  });
});
