import type { RecurrenceFrequency } from "@finance/shared";

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
 * Datas de ocorrência de uma recorrência dentro de um mês (competência local).
 * monthly: dia N (clampado ao fim do mês — ex.: dia 31 em fevereiro → 28/29);
 * yearly: dia N apenas no mês de referência; weekly: todas as semanas naquele dia.
 */
export function occurrencesInMonth(
  rule: RecurrenceRule,
  year: number,
  month: number,
): string[] {
  if (rule.frequency === "monthly") {
    return [iso(year, month, Math.min(rule.dayOfReference, daysInMonth(year, month)))];
  }
  if (rule.frequency === "yearly") {
    if (rule.monthOfReference !== month) return [];
    return [iso(year, month, Math.min(rule.dayOfReference, daysInMonth(year, month)))];
  }
  // weekly
  const dates: string[] = [];
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day++) {
    if (new Date(year, month - 1, day).getDay() === rule.dayOfReference % 7) {
      dates.push(iso(year, month, day));
    }
  }
  return dates;
}

/** Ocorrências dentro de um intervalo [from..to] (datas ISO YYYY-MM-DD, inclusivas). */
export function occurrencesInRange(rule: RecurrenceRule, from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  const dates: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    for (const date of occurrencesInMonth(rule, y, m)) {
      if (date >= from && date <= to) dates.push(date);
    }
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return dates;
}
