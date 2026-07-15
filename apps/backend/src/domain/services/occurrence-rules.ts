import type { RecurrenceFrequency } from "@finance/shared";

/** Regras puras de recorrência (domain — sem infra). */

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** Dia do mês (monthly/yearly) ou da semana em JS 0-6, domingo=0 (weekly). */
  dayOfReference: number;
  /** Apenas yearly: mês 1-12. */
  monthOfReference: number | null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Datas de ocorrência dentro de um mês. monthly: dia N (clampado ao fim do mês);
 * yearly: dia N apenas no mês de referência; weekly: todas as semanas naquele dia.
 */
export function occurrencesInMonth(rule: RecurrenceRule, year: number, month: number): string[] {
  if (rule.frequency === "monthly") {
    return [iso(year, month, Math.min(rule.dayOfReference, daysInMonth(year, month)))];
  }
  if (rule.frequency === "yearly") {
    if (rule.monthOfReference !== month) return [];
    return [iso(year, month, Math.min(rule.dayOfReference, daysInMonth(year, month)))];
  }
  const dates: string[] = [];
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day++) {
    if (new Date(year, month - 1, day).getDay() === rule.dayOfReference % 7) {
      dates.push(iso(year, month, day));
    }
  }
  return dates;
}

export function validateRule(rule: {
  frequency: RecurrenceFrequency;
  dayOfReference: number;
  monthOfReference?: number | null;
}): boolean {
  if (rule.frequency === "weekly") {
    return rule.dayOfReference >= 0 && rule.dayOfReference <= 6 && rule.monthOfReference == null;
  }
  if (rule.dayOfReference < 1 || rule.dayOfReference > 31) return false;
  if (rule.frequency === "yearly") {
    return rule.monthOfReference != null && rule.monthOfReference >= 1 && rule.monthOfReference <= 12;
  }
  return rule.monthOfReference == null;
}

/** lowercase + sem acentos — chave do cache de categorização e da busca (spec). */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
