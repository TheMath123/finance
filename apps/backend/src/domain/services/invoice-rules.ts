import type { InvoiceStatus } from "@finance/shared";
import type { CardInvoice } from "../entities/card";

/** Regras puras de fatura (domain — sem infra). */

export interface InvoicePeriod {
  month: number; // 1-12
  year: number;
}

/**
 * Competência (regra do spec): compra com dia ≤ closing_day cai na fatura do mês
 * da compra; depois do closing_day, na fatura do mês seguinte.
 */
export function competencePeriod(date: string, closingDay: number): InvoicePeriod {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  if (d <= closingDay) return { month: m, year: y };
  return m === 12 ? { month: 1, year: y + 1 } : { month: m + 1, year: y };
}

/** Avança um período de fatura em N meses (parcelas consecutivas). */
export function addMonths(period: InvoicePeriod, n: number): InvoicePeriod {
  const zeroBased = period.month - 1 + n;
  return { month: (zeroBased % 12) + 1, year: period.year + Math.floor(zeroBased / 12) };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Avança uma data (YYYY-MM-DD) em N meses, mantendo o dia (clampado no fim
 * do mês curto). Usado pra datar cada parcela na sua própria competência —
 * sem isso, todas as parcelas ficavam com a mesma data da compra original,
 * mesmo caindo em faturas de meses diferentes (auditoria 2026-07-20).
 */
export function addMonthsToDate(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const zeroBased = m - 1 + n;
  const year = y + Math.floor(zeroBased / 12);
  const month = (zeroBased % 12) + 1;
  const day = Math.min(d, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Divisão de parcelas em centavos: resto do arredondamento na primeira (regra do spec). */
export function splitInstallments(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base));
}

/**
 * Status efetivo calculado na leitura (M1, sem jobs): fatura `open` cuja data de
 * fechamento já passou é tratada como `closed`. Job pontual assume no M2.
 */
export function effectiveStatus(
  invoice: Pick<CardInvoice, "status" | "monthReference" | "yearReference">,
  closingDay: number,
  today = new Date(),
): InvoiceStatus {
  if (invoice.status !== "open") return invoice.status;
  const closing = new Date(
    invoice.yearReference,
    invoice.monthReference - 1,
    closingDay,
    23,
    59,
    59,
  );
  return today > closing ? "closed" : "open";
}
