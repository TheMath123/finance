/**
 * Testes do sistema de notificações (M2 — convite de workspace, fatura
 * fechou/vence, recorrência pendente) contra o Postgres local.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
  bankAccounts,
  banks,
  cardInvoices,
  cards,
  createDb,
  recurringTransactions,
  transactions,
  users,
  workspaceMembers,
  workspaces,
  type Db,
} from "@finance/db";
import type { Actor } from "../../deps";
import { createTestDeps, type DispatchedJob } from "../../../test/deps";
import { register } from "../auth";
import { acceptInvite, createInvite, createWorkspace } from "../workspace";
import {
  archiveNotification,
  createNotification,
  listNotificationPreferences,
  listNotifications,
  markNotificationRead,
  registerPushToken,
  runNotificationSweep,
  unarchiveNotification,
  updateNotificationPreference,
} from ".";

const uniqueEmail = () => `test-${crypto.randomUUID()}@test.local`;

let db: Db;

beforeAll(() => {
  db = createDb();
});

async function newOwnerActor(): Promise<Actor> {
  const deps = createTestDeps(db);
  const result = await register(deps, {
    name: "Dono Notificação",
    email: uniqueEmail(),
    password: "senha-forte-123",
  });
  if (!result.ok) throw new Error("falha ao registrar usuário de teste");
  return { userId: result.value.user.id, workspaceId: result.value.defaultWorkspaceId, role: "owner" };
}

describe("notification: criação respeita preferência", () => {
  test("cria a notificação e dispara push quando há token registrado", async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const actor = await newOwnerActor();
    await registerPushToken(deps, actor.userId, `ExponentPushToken[${crypto.randomUUID()}]`);

    const notification = await createNotification(deps, {
      userId: actor.userId,
      type: "workspace_invite",
      title: "Título",
      body: "Corpo",
    });

    expect(notification).not.toBeNull();
    expect(jobs.some((j) => j.name === "push.send")).toBe(true);
  });

  test("preferência desabilitada: não cria nada, nem push", async () => {
    const jobs: DispatchedJob[] = [];
    const deps = createTestDeps(db, jobs);
    const actor = await newOwnerActor();
    await updateNotificationPreference(deps, actor.userId, "workspace_invite", false);

    const notification = await createNotification(deps, {
      userId: actor.userId,
      type: "workspace_invite",
      title: "Título",
      body: "Corpo",
    });

    expect(notification).toBeNull();
    expect(jobs.some((j) => j.name === "push.send")).toBe(false);
  });
});

describe("notification: ciclo de vida (ler, arquivar, desarquivar)", () => {
  test("marcar como lida e arquivar/desarquivar funcionam; dono é obrigatório", async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();
    const stranger = await newOwnerActor();

    const notification = await createNotification(deps, {
      userId: actor.userId,
      type: "workspace_invite",
      title: "Título",
      body: "Corpo",
    });
    if (!notification) throw new Error("notificação não criada");

    const strangerRead = await markNotificationRead(deps, stranger.userId, notification.id);
    expect(strangerRead.ok).toBe(false);
    if (!strangerRead.ok) expect(strangerRead.error).toBe("notification_not_found");

    const read = await markNotificationRead(deps, actor.userId, notification.id);
    expect(read.ok).toBe(true);

    const archived = await archiveNotification(deps, actor.userId, notification.id);
    expect(archived.ok).toBe(true);

    const activeList = await listNotifications(deps, actor.userId, false);
    expect(activeList.some((n) => n.id === notification.id)).toBe(false);

    const archivedList = await listNotifications(deps, actor.userId, true);
    expect(archivedList.some((n) => n.id === notification.id)).toBe(true);

    const unarchived = await unarchiveNotification(deps, actor.userId, notification.id);
    expect(unarchived.ok).toBe(true);

    const activeAgain = await listNotifications(deps, actor.userId, false);
    expect(activeAgain.some((n) => n.id === notification.id)).toBe(true);
  });
});

describe("notification: preferências", () => {
  test("todos os tipos vêm habilitados por padrão; atualizar persiste", async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const initial = await listNotificationPreferences(deps, actor.userId);
    expect(initial.every((p) => p.enabled)).toBe(true);
    expect(initial.some((p) => p.type === "invoice_closed")).toBe(true);

    await updateNotificationPreference(deps, actor.userId, "invoice_closed", false);

    const after = await listNotificationPreferences(deps, actor.userId);
    const invoiceClosed = after.find((p) => p.type === "invoice_closed");
    expect(invoiceClosed?.enabled).toBe(false);
  });
});

describe("notification: convite de workspace notifica o convidado", () => {
  test("convidar um usuário existente cria notificação workspace_invite pra ele", async () => {
    const deps = createTestDeps(db);
    const ownerActor = await newOwnerActor();
    const family = await createWorkspace(deps, ownerActor.userId, { name: "Família Notificação" });
    if (!family.ok) throw new Error("workspace falhou");
    const familyOwner: Actor = { userId: ownerActor.userId, workspaceId: family.value.id, role: "owner" };

    const invitedDeps = createTestDeps(db);
    const invited = await register(invitedDeps, {
      name: "Convidado",
      email: uniqueEmail(),
      password: "senha-forte-123",
    });
    if (!invited.ok) throw new Error("registro falhou");

    const invite = await createInvite(deps, familyOwner, {
      emailOrPhone: invited.value.user.email,
      role: "member",
    });
    if (!invite.ok) throw new Error("convite falhou");

    const notifications = await listNotifications(deps, invited.value.user.id, false);
    expect(notifications.some((n) => n.type === "workspace_invite")).toBe(true);
  });
});

describe("notification: sweep diário (fatura fechou/vence, recorrência pendente)", () => {
  test("fatura open com closing_day no passado vira closed e notifica os membros", async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();

    const [bank] = await db
      .insert(banks)
      .values({ workspaceId: actor.workspaceId, name: "Banco Sweep", bankCode: "other" })
      .returning();
    const [card] = await db
      .insert(cards)
      .values({
        workspaceId: actor.workspaceId,
        bankId: bank!.id,
        name: "Cartão Fechado",
        limit: 100_000,
        closingDay: 28,
        dueDay: 5,
      })
      .returning();

    const now = new Date();
    const previous =
      now.getMonth() === 0
        ? { month: 12, year: now.getFullYear() - 1 }
        : { month: now.getMonth(), year: now.getFullYear() };

    const [invoice] = await db
      .insert(cardInvoices)
      .values({
        workspaceId: actor.workspaceId,
        cardId: card!.id,
        monthReference: previous.month,
        yearReference: previous.year,
        status: "open",
      })
      .returning();

    await runNotificationSweep(deps);

    const updated = await db.query.cardInvoices.findFirst({ where: eq(cardInvoices.id, invoice!.id) });
    expect(updated?.status).toBe("closed");

    const notifications = await listNotifications(deps, actor.userId, false);
    expect(
      notifications.some((n) => n.type === "invoice_closed" && (n.data as { invoiceId?: string })?.invoiceId === invoice!.id),
    ).toBe(true);

    // Rodar de novo não duplica (dedup por entityKey).
    await runNotificationSweep(deps);
    const notificationsAfter = await listNotifications(deps, actor.userId, false);
    const count = notificationsAfter.filter(
      (n) => n.type === "invoice_closed" && (n.data as { invoiceId?: string })?.invoiceId === invoice!.id,
    ).length;
    expect(count).toBe(1);
  });

  test("fatura closed com due_day hoje notifica vencimento", async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();
    const now = new Date();

    const [bank] = await db
      .insert(banks)
      .values({ workspaceId: actor.workspaceId, name: "Banco Vence", bankCode: "other" })
      .returning();
    const [card] = await db
      .insert(cards)
      .values({
        workspaceId: actor.workspaceId,
        bankId: bank!.id,
        name: "Cartão Vence Hoje",
        limit: 100_000,
        closingDay: 1,
        dueDay: now.getDate(),
      })
      .returning();
    const [invoice] = await db
      .insert(cardInvoices)
      .values({
        workspaceId: actor.workspaceId,
        cardId: card!.id,
        monthReference: now.getMonth() + 1,
        yearReference: now.getFullYear(),
        status: "closed",
      })
      .returning();

    await runNotificationSweep(deps);

    const notifications = await listNotifications(deps, actor.userId, false);
    expect(
      notifications.some((n) => n.type === "invoice_due" && (n.data as { invoiceId?: string })?.invoiceId === invoice!.id),
    ).toBe(true);
  });

  test("recorrência ativa com ocorrência hoje e não confirmada é lançada automaticamente e notifica (M2-09)", async () => {
    const deps = createTestDeps(db);
    const actor = await newOwnerActor();
    const now = new Date();

    const categories = await db.query.categories.findMany({ where: (c, { eq }) => eq(c.workspaceId, actor.workspaceId) });
    const categoryId = categories[0]!.id;

    const [bank] = await db
      .insert(banks)
      .values({ workspaceId: actor.workspaceId, name: "Banco Sweep Recorrência", bankCode: "other" })
      .returning();
    const [account] = await db
      .insert(bankAccounts)
      .values({
        workspaceId: actor.workspaceId,
        bankId: bank!.id,
        name: "Conta Sweep",
        type: "checking",
        initialBalance: 0,
      })
      .returning();

    const [recurring] = await db
      .insert(recurringTransactions)
      .values({
        workspaceId: actor.workspaceId,
        description: "Assinatura Sweep",
        amount: 5_000,
        type: "expense",
        method: "pix",
        categoryId,
        cardId: null,
        accountId: account!.id,
        frequency: "monthly",
        dayOfReference: now.getDate(),
        monthOfReference: null,
        active: true,
      })
      .returning();

    await runNotificationSweep(deps);

    const created = await db.query.transactions.findFirst({ where: eq(transactions.recurringId, recurring!.id) });
    expect(created).toBeDefined();
    expect(created?.date).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );

    const notifications = await listNotifications(deps, actor.userId, false);
    expect(
      notifications.some(
        (n) => n.type === "recurring_pending" && (n.data as { recurringId?: string })?.recurringId === recurring!.id,
      ),
    ).toBe(true);

    // Rodar de novo não duplica o lançamento nem a notificação (dedup por recurringId+data / entityKey).
    await runNotificationSweep(deps);
    const allCreated = await db.query.transactions.findMany({ where: eq(transactions.recurringId, recurring!.id) });
    expect(allCreated.length).toBe(1);
  });
});
