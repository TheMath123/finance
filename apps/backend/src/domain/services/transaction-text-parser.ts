/**
 * Camada 0 do pipeline de IA (M2-07, custo zero): parser regex/heurística pra
 * formatos óbvios de transação ("50 mercado nubank"). Só extrai valor +
 * texto restante — resolver conta/cartão/categoria fica pra quem chama (tem
 * acesso ao workspace), aqui é lógica pura sem I/O.
 */
export interface ParsedAmountAndRest {
  /** Centavos. */
  amountCents: number;
  /** Texto depois do valor, ainda não separado em descrição/conta-cartão. */
  rest: string;
}

const AMOUNT_AND_REST = /^(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s+(.+)$/i;

function parseAmountToCents(raw: string): number | null {
  // BR: "50", "50,90", "1.234,56" — vírgula decimal, ponto de milhar.
  // Sem vírgula, ponto é decimal ("50.90"), nunca milhar (regra do formato aceito acima).
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** `null` quando o texto não começa com um valor reconhecível — cai pra Camada 1 (IA). */
export function parseAmountAndRest(text: string): ParsedAmountAndRest | null {
  const match = AMOUNT_AND_REST.exec(text.trim());
  if (!match) return null;
  const amountCents = parseAmountToCents(match[1]!);
  if (amountCents === null || amountCents <= 0) return null;
  return { amountCents, rest: match[2]!.trim() };
}
