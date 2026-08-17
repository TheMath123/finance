import type { TransactionMethod, TransactionType } from '@finance/shared';

import type { NotificationPostedEvent } from '../../modules/notification-listener/src/NotificationListener.types';

/**
 * ⚠️ Nomes de pacote (Android) dos apps de banco/cartão — curados por
 * conhecimento geral, **não validados neste ambiente** (sem SDK/dispositivo
 * Android aqui). Pra confirmar/corrigir um valor: `adb shell pm list
 * packages | grep <banco>` num aparelho com o app instalado, ou olhar o `id`
 * na URL da Play Store (`play.google.com/store/apps/details?id=XXXX`).
 * Ajuste esta lista livremente — é só um filtro de ruído, não afeta nada
 * fora deste arquivo.
 */
const KNOWN_BANK_PACKAGES: Record<string, string> = {
  'com.nu.production': 'Nubank',
  'br.com.intermedium': 'Banco Inter',
  'com.picpay': 'PicPay',
  'com.mercadopago.wallet': 'Mercado Pago',
  'com.c6bank.app': 'C6 Bank',
  'com.itau': 'Itaú',
  'com.bradesco': 'Bradesco',
  'com.bb.android': 'Banco do Brasil',
  'com.santander.app': 'Santander',
  'com.caixa.gov': 'Caixa',
};

const AMOUNT_PATTERN = /R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/;

const INCOME_KEYWORDS =
  /receb|estorno|reembolso|dep[oó]sito|caiu na sua conta/i;
const CREDIT_METHOD_KEYWORDS = /cart[ãa]o de cr[eé]dito|fatura|cr[eé]dito/i;
const DEBIT_METHOD_KEYWORDS = /cart[ãa]o de d[eé]bito|d[eé]bito/i;
const PIX_METHOD_KEYWORDS = /pix/i;
const MERCHANT_PATTERN = /(?:em|no|na)\s+([A-Za-zÀ-ÿ0-9 .*-]{3,40})/i;

export interface ParsedBankNotification {
  packageName: string;
  bankLabel: string;
  postTime: number;
  /** Centavos (integer) — mesmo formato usado no resto do app. */
  amountCents: number;
  description: string;
  typeGuess: TransactionType;
  methodGuess: TransactionMethod | null;
  rawTitle: string | null;
  rawText: string | null;
}

function parseAmountToCents(match: string): number {
  const normalized = match.replace(/\./g, '').replace(',', '.');
  return Math.round(Number.parseFloat(normalized) * 100);
}

function guessMerchant(text: string): string | null {
  const match = MERCHANT_PATTERN.exec(text);
  return match?.[1]?.trim() ?? null;
}

/**
 * Best-effort — extrai valor e um palpite de tipo/método a partir do texto
 * cru da notificação. `null` quando o app não está na allowlist ou quando
 * não achou um valor em R$ (nada acionável). Nunca cria transação sozinho:
 * o resultado sempre passa por confirmação manual do usuário (ver
 * notification-suggestions.tsx) — os palpites só pré-preenchem o formulário.
 */
export function parseBankNotification(
  event: NotificationPostedEvent
): ParsedBankNotification | null {
  const bankLabel = KNOWN_BANK_PACKAGES[event.packageName];
  if (!bankLabel) return null;

  const text = [event.bigText, event.text, event.title]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  if (!text) return null;

  const amountMatch = AMOUNT_PATTERN.exec(text);
  if (!amountMatch?.[1]) return null;

  const merchant = guessMerchant(text);

  return {
    packageName: event.packageName,
    bankLabel,
    postTime: event.postTime,
    amountCents: parseAmountToCents(amountMatch[1]),
    description: merchant ?? `${bankLabel} — ${event.title ?? 'transação'}`,
    typeGuess: INCOME_KEYWORDS.test(text) ? 'income' : 'expense',
    methodGuess: CREDIT_METHOD_KEYWORDS.test(text)
      ? 'credit'
      : DEBIT_METHOD_KEYWORDS.test(text)
        ? 'debit'
        : PIX_METHOD_KEYWORDS.test(text)
          ? 'pix'
          : null,
    rawTitle: event.title,
    rawText: event.bigText ?? event.text,
  };
}
