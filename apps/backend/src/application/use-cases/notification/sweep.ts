import type { NotificationType } from "@finance/shared";
import { effectiveStatus } from "../../../domain/services/invoice-rules";
import { occurrencesInMonth } from "../../../domain/services/occurrence-rules";
import type { UseCaseDeps } from "../../deps";
import { createNotification } from "./create-notification";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function notifyWorkspaceMembers(
  deps: Pick<UseCaseDeps, "repos" | "dispatch">,
  workspaceId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, unknown>,
  entityKey: string,
): Promise<void> {
  const members = await deps.repos.workspace.listMembers(workspaceId);
  for (const member of members) {
    const already = await deps.repos.notification.existsForEntity(member.userId, type, entityKey);
    if (already) continue;
    await createNotification(deps, {
      userId: member.userId,
      workspaceId,
      type,
      title,
      body,
      data: { ...data, entityKey },
    });
  }
}

/** Fatura ainda `open` cujo `closingDay` já passou — persiste a transição (igual à leitura) e notifica. */
async function sweepInvoiceClosed(deps: Pick<UseCaseDeps, "repos" | "dispatch">): Promise<void> {
  const rows = await deps.repos.invoice.listAllOpen();
  for (const { invoice, closingDay, cardName } of rows) {
    const status = effectiveStatus(invoice, closingDay);
    if (status !== "closed") continue;
    await deps.repos.invoice.setStatus(invoice.id, status);
    await notifyWorkspaceMembers(
      deps,
      invoice.workspaceId,
      "invoice_closed",
      "Fatura fechou",
      `A fatura do cartão ${cardName} fechou.`,
      { invoiceId: invoice.id, cardId: invoice.cardId },
      invoice.id,
    );
  }
}

/** Fatura `closed` (não paga) cujo `dueDay` é hoje. */
async function sweepInvoiceDue(deps: Pick<UseCaseDeps, "repos" | "dispatch">): Promise<void> {
  const rows = await deps.repos.invoice.listAllClosedUnpaid();
  const now = new Date();
  for (const { invoice, dueDay, cardName } of rows) {
    if (invoice.yearReference !== now.getFullYear() || invoice.monthReference !== now.getMonth() + 1) continue;
    const clampedDue = Math.min(dueDay, daysInMonth(invoice.yearReference, invoice.monthReference));
    if (now.getDate() !== clampedDue) continue;
    await notifyWorkspaceMembers(
      deps,
      invoice.workspaceId,
      "invoice_due",
      "Fatura vence hoje",
      `A fatura do cartão ${cardName} vence hoje.`,
      { invoiceId: invoice.id, cardId: invoice.cardId },
      `${invoice.id}:due`,
    );
  }
}

/** Recorrência ativa com ocorrência prevista pra hoje e ainda não confirmada. */
async function sweepRecurringPending(deps: Pick<UseCaseDeps, "repos" | "dispatch">): Promise<void> {
  const rules = await deps.repos.recurring.listAllActive();
  if (rules.length === 0) return;

  const today = todayIso();
  const [year, month] = today.split("-").map(Number) as [number, number];

  const confirmed = await deps.repos.transaction.confirmedOccurrenceKeys(rules.map((r) => r.id));
  const confirmedKeys = new Set(confirmed.map((c) => `${c.recurringId}:${c.date}`));

  for (const rule of rules) {
    const dates = occurrencesInMonth(
      { frequency: rule.frequency, dayOfReference: rule.dayOfReference, monthOfReference: rule.monthOfReference },
      year,
      month,
    );
    if (!dates.includes(today)) continue;

    const key = `${rule.id}:${today}`;
    if (confirmedKeys.has(key)) continue;

    await notifyWorkspaceMembers(
      deps,
      rule.workspaceId,
      "recurring_pending",
      "Recorrência pendente",
      `"${rule.description}" está prevista pra hoje — confirme o lançamento.`,
      { recurringId: rule.id, date: today },
      key,
    );
  }
}

/**
 * Sweep diário (job repetível do BullMQ, `main/worker.ts`) — sistema inteiro,
 * não escopado a um workspace. Gera as notificações de fatura fechou/vence e
 * recorrência pendente (spec M2-09/M2-10, adiantadas junto do sistema de
 * notificações).
 */
export async function runNotificationSweep(deps: Pick<UseCaseDeps, "repos" | "dispatch">): Promise<void> {
  await sweepInvoiceClosed(deps);
  await sweepInvoiceDue(deps);
  await sweepRecurringPending(deps);
}
