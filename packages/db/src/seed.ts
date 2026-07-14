/**
 * Seed de DEV (`bun run db:seed`) — idempotente.
 * Popula usuário demo, workspace, banco/conta/cartão, categorias e transações realistas
 * (parceladas, recorrentes, faturas em vários status), conforme o spec.
 * O seed de PRODUÇÃO é outro: só categorias padrão, criadas junto com cada workspace.
 */
import { eq } from "drizzle-orm";
import { createDb } from "./client";
import {
  bankAccounts,
  banks,
  cardInvoices,
  cards,
  categories,
  recurringTransactions,
  transactions,
  users,
  workspaceMembers,
  workspaces,
} from "./schema";

import { DEFAULT_CATEGORIES } from "./default-categories";

const DEMO_EMAIL = "demo@finance.local";

function normalize(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function seed() {
  const db = createDb();

  const existing = await db.select().from(users).where(eq(users.email, DEMO_EMAIL));
  if (existing.length > 0) {
    console.log("Seed já aplicado (usuário demo existe). Nada a fazer.");
    process.exit(0);
  }

  const passwordHash = await Bun.password.hash("demo1234", {
    algorithm: "bcrypt",
    cost: 12,
  });

  const [user] = await db
    .insert(users)
    .values({
      name: "Usuário Demo",
      email: DEMO_EMAIL,
      passwordHash,
      termsAcceptedAt: new Date(),
      termsVersion: "dev",
      emailVerifiedAt: new Date(),
    })
    .returning();
  if (!user) throw new Error("falha ao criar usuário demo");

  const [workspace] = await db
    .insert(workspaces)
    .values({ name: "Pessoal", type: "personal" })
    .returning();
  if (!workspace) throw new Error("falha ao criar workspace");

  await db.update(users).set({ defaultWorkspaceId: workspace.id }).where(eq(users.id, user.id));
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: workspace.id, userId: user.id, role: "owner" });

  const insertedCategories = await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((c) => ({
        workspaceId: workspace.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isFallback: c.isFallback ?? false,
      })),
    )
    .returning();
  const cat = (name: string) => {
    const found = insertedCategories.find((c) => c.name === name);
    if (!found) throw new Error(`categoria ${name} não encontrada`);
    return found.id;
  };

  const [nubank] = await db
    .insert(banks)
    .values({ workspaceId: workspace.id, name: "Nubank", bankCode: "nubank" })
    .returning();
  if (!nubank) throw new Error("falha ao criar banco");

  const [account] = await db
    .insert(bankAccounts)
    .values({
      workspaceId: workspace.id,
      bankId: nubank.id,
      name: "Conta Nubank",
      type: "checking",
      initialBalance: 250_000, // R$ 2.500,00
    })
    .returning();
  if (!account) throw new Error("falha ao criar conta");

  const [card] = await db
    .insert(cards)
    .values({
      workspaceId: workspace.id,
      bankId: nubank.id,
      name: "Nubank Ultravioleta",
      limit: 800_000, // R$ 8.000,00
      closingDay: 3,
      dueDay: 10,
    })
    .returning();
  if (!card) throw new Error("falha ao criar cartão");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [paidInvoice] = await db
    .insert(cardInvoices)
    .values({
      workspaceId: workspace.id,
      cardId: card.id,
      monthReference: prevMonth,
      yearReference: prevYear,
      status: "paid",
    })
    .returning();
  const [openInvoice] = await db
    .insert(cardInvoices)
    .values({
      workspaceId: workspace.id,
      cardId: card.id,
      monthReference: month,
      yearReference: year,
      status: "open",
    })
    .returning();
  if (!paidInvoice || !openInvoice) throw new Error("falha ao criar faturas");

  const tx = (v: {
    description: string;
    amount: number;
    type: "income" | "expense";
    method: "pix" | "debit" | "cash" | "credit" | "transfer";
    date: string;
    categoryId: string;
    accountId?: string;
    cardId?: string;
    invoiceId?: string;
    installmentNumber?: number;
    installmentTotal?: number;
  }) => ({
    workspaceId: workspace.id,
    createdBy: user.id,
    descriptionNormalized: normalize(v.description),
    ...v,
  });

  await db.insert(transactions).values([
    // Receita recorrente do mês
    tx({
      description: "Salário",
      amount: 750_000,
      type: "income",
      method: "pix",
      date: isoDate(year, month, 5),
      categoryId: cat("Salário"),
      accountId: account.id,
    }),
    // Despesas de conta
    tx({
      description: "Supermercado Pão de Açúcar",
      amount: 38_750,
      type: "expense",
      method: "debit",
      date: isoDate(year, month, 7),
      categoryId: cat("Mercado"),
      accountId: account.id,
    }),
    tx({
      description: "Uber",
      amount: 2_390,
      type: "expense",
      method: "pix",
      date: isoDate(year, month, 9),
      categoryId: cat("Transporte"),
      accountId: account.id,
    }),
    // Fatura paga (mês anterior)
    tx({
      description: "Netflix",
      amount: 5_590,
      type: "expense",
      method: "credit",
      date: isoDate(prevYear, prevMonth, 1),
      categoryId: cat("Assinaturas"),
      cardId: card.id,
      invoiceId: paidInvoice.id,
    }),
    // Fatura aberta (mês atual)
    tx({
      description: "Restaurante japonês Sushi Yama",
      amount: 18_900,
      type: "expense",
      method: "credit",
      date: isoDate(year, month, 8),
      categoryId: cat("Lazer"),
      cardId: card.id,
      invoiceId: openInvoice.id,
    }),
    // Compra parcelada 3x de R$ 900,00 → 300,02 + 299,99 + 299,99 (resto na primeira)
    tx({
      description: "Notebook (1/3)",
      amount: 30_002,
      type: "expense",
      method: "credit",
      date: isoDate(year, month, 2),
      categoryId: cat("Outros"),
      cardId: card.id,
      invoiceId: openInvoice.id,
      installmentNumber: 1,
      installmentTotal: 3,
    }),
  ]);

  await db.insert(recurringTransactions).values([
    {
      workspaceId: workspace.id,
      description: "Salário",
      amount: 750_000,
      type: "income",
      method: "pix",
      categoryId: cat("Salário"),
      accountId: account.id,
      frequency: "monthly",
      dayOfReference: 5,
    },
    {
      workspaceId: workspace.id,
      description: "Aluguel",
      amount: 220_000,
      type: "expense",
      method: "pix",
      categoryId: cat("Moradia"),
      accountId: account.id,
      frequency: "monthly",
      dayOfReference: 10,
    },
  ]);

  console.log(`Seed aplicado: ${DEMO_EMAIL} / demo1234 (workspace "${workspace.name}")`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
