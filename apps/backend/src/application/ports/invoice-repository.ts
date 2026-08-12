import type { InvoiceStatus } from '@finance/shared';
import type { CardInvoice } from '../../domain/entities/card';
import type { InvoicePeriod } from '../../domain/services/invoice-rules';

export interface InvoiceRepository {
  findInWorkspace(
    workspaceId: string,
    invoiceId: string
  ): Promise<CardInvoice | undefined>;
  findById(invoiceId: string): Promise<CardInvoice | undefined>;
  /** Criação lazy por competência (única por cartão+período; tolera corrida). */
  getOrCreate(
    workspaceId: string,
    cardId: string,
    period: InvoicePeriod
  ): Promise<CardInvoice>;
  /** Leitura pura por cartão+período — sem criar (preview de import de CSV não pode ter efeito colateral). */
  findByCardAndPeriod(
    cardId: string,
    period: InvoicePeriod
  ): Promise<CardInvoice | undefined>;
  listByCard(cardId: string): Promise<CardInvoice[]>;
  /** Paginada e com filtro opcional por competência — usada pela tela de faturas (dashboard). */
  listByCardPaginated(
    cardId: string,
    filters: { limit?: number; offset?: number; month?: number; year?: number }
  ): Promise<{ invoices: CardInvoice[]; total: number }>;
  /** Fatura não paga mais antiga (a próxima a vencer/exigir atenção) — para destaque na UI. */
  findOldestUnpaid(cardId: string): Promise<CardInvoice | undefined>;
  setStatus(invoiceId: string, status: InvoiceStatus): Promise<void>;
  /** Condicional (`WHERE status <> 'paid'`) — `undefined` se outra chamada já marcou paga primeiro (corrida). */
  markPaid(
    invoiceId: string,
    paymentTransactionId: string
  ): Promise<CardInvoice | undefined>;
  /**
   * Reverso de `markPaid` — desfaz um pagamento lançado por engano (ex.: fatura
   * ainda aberta paga sem querer). Condicional (`WHERE status = 'paid'`),
   * limpa `payment_transaction_id`; `undefined` se a fatura já não estava paga
   * (corrida ou chamada duplicada).
   */
  unmarkPaid(
    invoiceId: string,
    status: InvoiceStatus
  ): Promise<CardInvoice | undefined>;
  /** Total derivado: Σ despesas − Σ receitas das transações não deletadas. */
  total(invoiceId: string): Promise<number>;
  /** Subconjunto pago dos ids informados — single query, sem N+1 (usada pra marcar transações imutáveis na listagem). */
  paidInvoiceIds(invoiceIds: string[]): Promise<Set<string>>;
  /** Σ dos totais das faturas não pagas (limite disponível derivado). */
  unpaidTotalByCard(cardId: string): Promise<number>;
  listUnpaidWithDue(
    workspaceId: string
  ): Promise<{ id: string; month: number; year: number; dueDay: number }[]>;
  deleteByCard(cardId: string): Promise<void>;
  /** Sweep de notificação (sistema inteiro, não por workspace) — fatura ainda `open` cujo cartão já tem `closingDay`. */
  listAllOpen(): Promise<
    { invoice: CardInvoice; closingDay: number; cardName: string }[]
  >;
  /** Sweep de notificação — fatura `closed` (não paga) cujo cartão já tem `dueDay`. */
  listAllClosedUnpaid(): Promise<
    { invoice: CardInvoice; dueDay: number; cardName: string }[]
  >;
}
